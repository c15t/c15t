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

	/**
	 * Comparing columns alone is not enough — an earlier version of this
	 * baseline created every column correctly and no foreign keys at all, and
	 * the column tests passed. Constraints are part of the shape.
	 */
	it.effect(
		'reproduces every foreign key',
		() =>
			Effect.gen(function* () {
				yield* up;
				const sql = yield* SqlClient.SqlClient;

				const loaded = yield* Effect.promise(() =>
					loadFixture('fumadb-2.0.0', 'postgres')
				);
				if (loaded.kind !== 'captured') {
					assert.fail('expected a captured fixture');
					return;
				}

				const expected = loaded.fixture.foreignKeys
					.map(
						(fk) =>
							`${fk.table}.${fk.columns.join('+')}->${fk.referencedTable}.${fk.referencedColumns.join('+')}`
					)
					.sort();

				const rows = yield* sql<{
					table_name: string;
					column_name: string;
					referenced_table: string;
					referenced_column: string;
				}>`
					select
						cl.relname as table_name,
						att.attname as column_name,
						fcl.relname as referenced_table,
						fatt.attname as referenced_column
					from pg_constraint con
					join pg_class cl on cl.oid = con.conrelid
					join pg_class fcl on fcl.oid = con.confrelid
					join unnest(con.conkey) with ordinality as k(attnum, ord) on true
					join unnest(con.confkey) with ordinality as f(attnum, ord) on f.ord = k.ord
					join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
					join pg_attribute fatt on fatt.attrelid = con.confrelid and fatt.attnum = f.attnum
					where con.contype = 'f'
				`;

				const actual = rows
					.map(
						(row) =>
							`${row.table_name}.${row.column_name}->${row.referenced_table}.${row.referenced_column}`
					)
					.sort();

				assert.deepStrictEqual(actual, expected);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'reproduces every unique and primary key constraint',
		() =>
			Effect.gen(function* () {
				yield* up;
				const sql = yield* SqlClient.SqlClient;

				const loaded = yield* Effect.promise(() =>
					loadFixture('fumadb-2.0.0', 'postgres')
				);
				if (loaded.kind !== 'captured') {
					assert.fail('expected a captured fixture');
					return;
				}

				// Index *names* are engine-generated and not worth pinning; the
				// behaviour is (table, columns, unique, primary).
				const describe_ = (index: {
					table: string;
					columns: readonly string[];
					isUnique: boolean;
					isPrimary: boolean;
				}) =>
					`${index.table}.${index.columns.join('+')} unique=${index.isUnique} pk=${index.isPrimary}`;

				const expected = loaded.fixture.indexes
					.filter((index) => !/(^|_)c15t_settings$/.test(index.table))
					.map(describe_)
					.sort();

				const rows = yield* sql<{
					table_name: string;
					column_name: string;
					is_unique: boolean;
					is_primary: boolean;
				}>`
					select
						t.relname as table_name,
						a.attname as column_name,
						ix.indisunique as is_unique,
						ix.indisprimary as is_primary
					from pg_class t
					join pg_namespace n on n.oid = t.relnamespace
					join pg_index ix on t.oid = ix.indrelid
					join unnest(ix.indkey) with ordinality as k(attnum, ord) on true
					join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
					where n.nspname = 'public' and t.relkind = 'r'
				`;

				const actual = rows
					.map((row) =>
						describe_({
							table: row.table_name,
							columns: [row.column_name],
							isUnique: row.is_unique,
							isPrimary: row.is_primary,
						})
					)
					.sort();

				assert.deepStrictEqual(actual, expected);
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
