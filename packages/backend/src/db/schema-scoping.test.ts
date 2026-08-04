/**
 * Keeping c15t's tables in a Postgres schema.
 *
 * Opt-in, because this needs a real Postgres rather than PGlite: the whole
 * point is that the scoping survives a **connection pool**, and PGlite has one
 * connection. A one-off `SET search_path` would scope exactly one checkout and
 * pass a PGlite test while failing in production.
 *
 * ```
 * docker run --rm -d -p 5455:5432 -e POSTGRES_PASSWORD=c15t \
 *   -e POSTGRES_DB=c15t --name c15t-pg postgres:16
 * C15T_TEST_PG_URL=postgres://postgres:c15t@127.0.0.1:5455/c15t bun run test
 * ```
 *
 * The unit-level half — that the URL is built correctly — runs everywhere.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect, ManagedRuntime } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { toLayer, withSearchPath } from './connect';
import { migrate } from './migrate';

const PG_URL = process.env.C15T_TEST_PG_URL;
const suite = PG_URL ? describe : describe.skip;

describe('withSearchPath', () => {
	it('leaves the url alone when no schema is set', () => {
		const url = 'postgres://u:p@host:5432/db';
		assert.strictEqual(withSearchPath(url, undefined), url);
		assert.strictEqual(withSearchPath(url, ''), url);
	});

	it('adds the search_path option', () => {
		const out = new URL(withSearchPath('postgres://u:p@host:5432/db', 'c15t'));
		assert.strictEqual(out.searchParams.get('options'), '-c search_path=c15t');
	});

	it('keeps other connection parameters', () => {
		const out = new URL(
			withSearchPath('postgres://u:p@host:5432/db?sslmode=require', 'c15t')
		);
		// Dropping sslmode while adding a schema would silently downgrade the
		// connection's security.
		assert.strictEqual(out.searchParams.get('sslmode'), 'require');
		assert.strictEqual(out.searchParams.get('options'), '-c search_path=c15t');
	});

	it('keeps an existing options parameter', () => {
		const out = new URL(
			withSearchPath(
				'postgres://u:p@host:5432/db?options=-c timezone%3DUTC',
				'c15t'
			)
		);
		// Overwriting would silently drop startup options the operator set —
		// the same class of loss the sslmode case above guards against.
		const options = out.searchParams.get('options') ?? '';
		assert.include(options, '-c timezone=UTC');
		assert.include(options, '-c search_path=c15t');
	});

	it('rejects a name that is not a plain identifier', () => {
		// This lands in a startup parameter rather than a bound value, so it is
		// refused rather than escaped.
		assert.throws(() => withSearchPath('postgres://h/db', 'c15t; drop schema'));
		assert.throws(() => withSearchPath('postgres://h/db', '1bad'));
		assert.throws(() => withSearchPath('postgres://h/db', 'has space'));
	});
});

suite('schema scoping against real Postgres', () => {
	const withSchema = async <A>(
		schema: string,
		use: (
			runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>
		) => Promise<A>
	): Promise<A> => {
		const runtime = ManagedRuntime.make(
			toLayer({ dialect: 'postgres', url: PG_URL ?? '', schema })
		);
		try {
			return await use(runtime);
		} finally {
			await runtime.dispose();
		}
	};

	it('migrates into the schema and leaves public alone', async () => {
		const schema = 'c15t_scope_a';

		await withSchema(schema, async (runtime) => {
			await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					yield* sql.unsafe(`drop schema if exists ${schema} cascade`);
					// Establish the precondition rather than inherit it. The rest of
					// the suite now runs against this same server and leaves its own
					// tables in `public`, so this passing without the drop would be
					// luck about test ordering rather than evidence.
					yield* sql.unsafe('drop table if exists public.subject cascade');
				})
			);
		});

		await withSchema(schema, async (runtime) => {
			// The schema does not exist yet — creating it is the migrator's job,
			// or every `create table` fails with an error that never mentions
			// schemas.
			const report = await runtime.runPromise(migrate());
			assert.isTrue(report.applied);

			await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;

					const mine = yield* sql<{ n: string }>`
							select count(*) as n from information_schema.tables
							where table_schema = ${schema}
						`;
					const inPublic = yield* sql<{ n: string }>`
							select count(*) as n from information_schema.tables
							where table_schema = 'public' and table_name = 'subject'
						`;

					assert.isAbove(Number(mine[0]?.n), 5);
					// The entire point: sharing a database must not mean
					// cannibalising public.
					assert.strictEqual(Number(inPublic[0]?.n), 0);
				})
			);
		});
	}, 120_000);

	it('keeps two schemas independent on one database', async () => {
		for (const schema of ['c15t_scope_b', 'c15t_scope_c']) {
			await withSchema(schema, async (runtime) => {
				await runtime.runPromise(
					Effect.gen(function* () {
						const sql = yield* SqlClient.SqlClient;
						yield* sql.unsafe(`drop schema if exists ${schema} cascade`);
					})
				);
			});
			await withSchema(schema, (runtime) => runtime.runPromise(migrate()));
		}

		await withSchema('c15t_scope_b', async (runtime) => {
			await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					yield* sql`
							insert into ${sql('subject')} ${sql.insert({
								id: 'sub_in_b',
								createdAt: new Date(),
								updatedAt: new Date(),
							})}
						`;
				})
			);
		});

		await withSchema('c15t_scope_c', async (runtime) => {
			const rows = await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					return yield* sql<{
						id: string;
					}>`select ${sql('id')} from ${sql('subject')}`;
				})
			);
			// Two tenants of the same server, isolated by schema rather than by
			// a naming convention — which is what makes grants and
			// `DROP SCHEMA` meaningful.
			assert.strictEqual(rows.length, 0);
		});
	}, 120_000);

	it('is idempotent when the schema already exists', async () => {
		const schema = 'c15t_scope_d';
		await withSchema(schema, async (runtime) => {
			await runtime.runPromise(
				Effect.gen(function* () {
					const sql = yield* SqlClient.SqlClient;
					yield* sql.unsafe(`drop schema if exists ${schema} cascade`);
				})
			);
		});

		await withSchema(schema, async (runtime) => {
			await runtime.runPromise(migrate());
			const again = await runtime.runPromise(migrate());

			assert.deepStrictEqual(again.adoption, []);
			assert.deepStrictEqual(again.pending, []);
		});
	}, 120_000);
});
