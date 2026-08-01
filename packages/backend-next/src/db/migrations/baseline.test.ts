/**
 * The baseline migration has to land a fresh database on the *same* physical
 * shape a shipped 2.0.0 database already has.
 *
 * That is the load-bearing property of RFC 0004's frozen-schema rule. If a
 * fresh install and an adopted 2.0.0 database diverge, then every downstream
 * claim breaks at once: the migrator's adoption step has two targets instead
 * of one, the benchmark arms stop comparing like with like, and wire
 * compatibility becomes a matter of hoping rather than knowing.
 *
 * So this asserts against the committed fixture captured from the real
 * published `@c15t/backend@2.1.0` — not against a schema definition in this
 * repo, which would only prove the baseline agrees with itself.
 */

import { loadFixture } from '@c15t/migration-fixtures';
import { PgliteClient } from '@effect/sql-pglite';
import { SqliteClient } from '@effect/sql-sqlite-node';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { up } from './1-baseline';

/** Tables the baseline creates, per the fixture. */
const EXPECTED_TABLES = [
	'auditLog',
	'consent',
	'consentPolicy',
	'consentPurpose',
	'domain',
	'runtimePolicyDecision',
	'subject',
] as const;

/**
 * In-process Postgres. `@effect/sql-pglite` is published only for Effect v4,
 * so the harness the old package hand-rolled in one integration test is a
 * first-class layer here (RFC 0004 §6).
 */
const Pglite = PgliteClient.layer({});

/** Column names actually present, straight from `information_schema`. */
const introspect = Effect.fn('introspect')(function* (table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{
		column_name: string;
	}>`select column_name from information_schema.columns where table_name = ${table}`;
	return rows.map((row) => row.column_name).sort();
});

const tableNames = Effect.fn('tableNames')(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ table_name: string }>`
		select table_name from information_schema.tables
		where table_schema = 'public' and table_type = 'BASE TABLE'
	`;
	return rows.map((row) => row.table_name).sort();
});

describe('baseline migration', () => {
	it.effect(
		'creates exactly the tables a shipped 2.0.0 database has',
		() =>
			Effect.gen(function* () {
				yield* up;

				const loaded = yield* Effect.promise(() =>
					loadFixture('fumadb-2.0.0', 'postgres')
				);
				assert.strictEqual(
					loaded.kind,
					'captured',
					'fumadb-2.0.0/postgres should be a captured fixture'
				);
				if (loaded.kind !== 'captured') return;

				// The fixture carries fumadb's own marker table; the baseline
				// deliberately does not create it. Our migrator owns its ledger
				// (RFC §3.3) rather than inheriting fumadb's bookkeeping.
				const fromFixture = loaded.fixture.tables
					.map((table) => table.name)
					.filter((name) => !/(^|_)c15t_settings$/.test(name))
					.sort();

				assert.deepStrictEqual(fromFixture, [...EXPECTED_TABLES]);
				assert.deepStrictEqual(yield* tableNames(), [...EXPECTED_TABLES]);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	for (const table of EXPECTED_TABLES) {
		it.effect(
			`reproduces every column of "${table}"`,
			() =>
				Effect.gen(function* () {
					yield* up;

					const loaded = yield* Effect.promise(() =>
						loadFixture('fumadb-2.0.0', 'postgres')
					);
					if (loaded.kind !== 'captured') {
						assert.fail('expected a captured fixture');
						return;
					}

					const expected = loaded.fixture.tables
						.find((candidate) => candidate.name === table)
						?.columns.map((column) => column.name)
						.sort();

					assert.isDefined(expected, `fixture has no table "${table}"`);
					assert.deepStrictEqual(yield* introspect(table), expected);
				}).pipe(Effect.provide(Pglite)),
			{ timeout: 60_000 }
		);
	}
});

/**
 * SQLite gets the same treatment because its physical types are the ones most
 * easily got wrong: it collapses everything to `TEXT` and `INTEGER`, stores
 * timestamps as epoch integers, and declares ids as `TEXT` rather than
 * `varchar`. Those mappings in `../dialect.ts` were derived from the SQLite
 * fixture rather than from what the engine would accept, and this is what
 * keeps them honest.
 */
describe('baseline migration (sqlite)', () => {
	const Sqlite = SqliteClient.layer({ filename: ':memory:' });

	const sqliteColumns = Effect.fn('sqliteColumns')(function* (table: string) {
		const sql = yield* SqlClient.SqlClient;
		const rows = yield* sql<{
			name: string;
		}>`select name from pragma_table_info(${table})`;
		return rows.map((row) => row.name).sort();
	});

	for (const table of EXPECTED_TABLES) {
		it.effect(
			`reproduces every column of "${table}"`,
			() =>
				Effect.gen(function* () {
					yield* up;

					const loaded = yield* Effect.promise(() =>
						loadFixture('fumadb-2.0.0', 'sqlite')
					);
					if (loaded.kind !== 'captured') {
						assert.fail('expected a captured fixture');
						return;
					}

					const expected = loaded.fixture.tables
						.find((candidate) => candidate.name === table)
						?.columns.map((column) => column.name)
						.sort();

					assert.isDefined(expected, `fixture has no table "${table}"`);
					assert.deepStrictEqual(yield* sqliteColumns(table), expected);
				}).pipe(Effect.provide(Sqlite)),
			{ timeout: 60_000 }
		);
	}
});
