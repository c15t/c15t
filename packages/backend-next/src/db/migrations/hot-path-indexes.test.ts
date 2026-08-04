/**
 * Migration 2 adds the indexes no shipped version had. Three properties
 * matter, and they are the ones the RFC's argument rests on:
 *
 * 1. It leaves the baseline's own constraints alone — adding indexes must not
 *    quietly change a primary key or a unique constraint.
 * 2. It is idempotent, because the adoption step may re-run it after a
 *    partially applied migration (RFC §3.3).
 * 3. Every index it claims to create actually exists afterwards. An index that
 *    silently failed to apply would make the benchmark comparison meaningless
 *    in the most flattering possible direction.
 */

import { PgliteClient } from '@effect/sql-pglite';
import { SqliteClient } from '@effect/sql-sqlite-node';
import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { up as baseline } from './1-baseline';
import { up as hotPathIndexes, INDEXES } from './2-hot-path-indexes';

const Pglite = PgliteClient.layer({});

/** Non-primary, non-unique index names present in the database. */
const indexNames = Effect.fn('indexNames')(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{ indexname: string }>`
		select indexname from pg_indexes where schemaname = 'public'
	`;
	return rows.map((row) => row.indexname).sort();
});

const constraintFingerprint = Effect.fn('constraintFingerprint')(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql<{
		table_name: string;
		column_name: string;
		is_unique: boolean;
		is_primary: boolean;
	}>`
		select t.relname as table_name, a.attname as column_name,
		       ix.indisunique as is_unique, ix.indisprimary as is_primary
		from pg_class t
		join pg_namespace n on n.oid = t.relnamespace
		join pg_index ix on t.oid = ix.indrelid
		join unnest(ix.indkey) with ordinality as k(attnum, ord) on true
		join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
		where n.nspname = 'public' and t.relkind = 'r'
		  and (ix.indisunique or ix.indisprimary)
	`;
	return rows
		.map(
			(row) =>
				`${row.table_name}.${row.column_name} unique=${row.is_unique} pk=${row.is_primary}`
		)
		.sort();
});

describe('hot-path indexes', () => {
	it.effect(
		'creates every index it declares',
		() =>
			Effect.gen(function* () {
				yield* baseline;
				yield* hotPathIndexes;

				const present = yield* indexNames();
				for (const index of INDEXES) {
					assert.include(
						present,
						index.name,
						`${index.name} is declared but was not created — ${index.reason}`
					);
				}
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'leaves the baseline primary key and unique constraints untouched',
		() =>
			Effect.gen(function* () {
				yield* baseline;
				const before = yield* constraintFingerprint();
				yield* hotPathIndexes;
				const after = yield* constraintFingerprint();

				assert.deepStrictEqual(after, before);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'is idempotent',
		() =>
			Effect.gen(function* () {
				yield* baseline;
				yield* hotPathIndexes;
				const once = yield* indexNames();

				// The adoption step can re-run a migration after a partial
				// application, so a second run must be a no-op rather than an
				// "already exists" failure.
				yield* hotPathIndexes;
				assert.deepStrictEqual(yield* indexNames(), once);
			}).pipe(Effect.provide(Pglite)),
		{ timeout: 60_000 }
	);

	it.effect(
		'applies on sqlite too',
		() =>
			Effect.gen(function* () {
				yield* baseline;
				yield* hotPathIndexes;

				const sql = yield* SqlClient.SqlClient;
				const rows = yield* sql<{ name: string }>`
					select name from sqlite_master where type = 'index' and name not like 'sqlite_%'
				`;
				const present = rows.map((row) => row.name).sort();
				for (const index of INDEXES) {
					assert.include(present, index.name);
				}
			}).pipe(Effect.provide(SqliteClient.layer({ filename: ':memory:' }))),
		{ timeout: 60_000 }
	);
});
