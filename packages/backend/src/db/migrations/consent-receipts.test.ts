/**
 * Migration 3, on every engine.
 *
 * Three properties: it adds exactly the column, column and table it claims
 * to; it can be re-run after a partial apply without failing on what already
 * landed; and it leaves the baseline's own shape alone, so a database adopted
 * from 2.x and a fresh install still agree about everything migration 1
 * covers.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import {
	PRIVACY_DIRECTIVE_INDEXES,
	PRIVACY_DIRECTIVE_TABLE,
	up as receipts,
} from './3-consent-receipts-and-privacy-directives';

const columnsOf = Effect.fn('columnsOf')(function* columnsOf(table: string) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
				select column_name as name from information_schema.columns
				where table_schema = database() and table_name = ${table}
			`,
		orElse: () =>
			sql<{ name: string }>`
				select column_name as name from information_schema.columns
				where table_schema = current_schema() and table_name = ${table}
			`,
		sqlite: () =>
			sql<{ name: string }>`select name from pragma_table_info(${table})`,
	});
	return rows.map((row) => row.name).sort();
});

const indexNames = Effect.fn('indexNames')(function* indexNames() {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
				select distinct index_name as name from information_schema.statistics
				where table_schema = database()
			`,
		orElse: () =>
			sql<{ name: string }>`
				select indexname as name from pg_indexes
				where schemaname = current_schema()
			`,
		sqlite: () =>
			sql<{ name: string }>`
				select name from sqlite_master where type = 'index'
			`,
	});
	return new Set(rows.map((row) => row.name));
});

for (const engine of ENGINES) {
	describe(`consent receipts migration on ${engine.name}`, () => {
		it.effect(
			'adds the receipt column, the link authority column and the directive table',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					const before = yield* columnsOf('consent');
					assert.notInclude(before, 'choice');

					yield* receipts;

					assert.include(yield* columnsOf('consent'), 'choice');
					assert.include(yield* columnsOf('subject'), 'identityAuthority');
					assert.deepStrictEqual(
						yield* columnsOf('privacyDirective'),
						PRIVACY_DIRECTIVE_TABLE.columns.map((column) => column.name).sort()
					);
					const names = yield* indexNames();
					for (const index of PRIVACY_DIRECTIVE_INDEXES) {
						assert.isTrue(names.has(index.name), `missing ${index.name}`);
					}
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'is idempotent',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					yield* receipts;
					// A second run must neither fail on the existing column nor add
					// a second copy of anything.
					yield* receipts;

					const consent = yield* columnsOf('consent');
					assert.strictEqual(
						consent.filter((column) => column === 'choice').length,
						1
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'leaves the baseline columns untouched',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					const before = yield* columnsOf('consent');
					yield* indexes;
					yield* receipts;
					const after = yield* columnsOf('consent');
					assert.deepStrictEqual(
						after.filter((column) => column !== 'choice'),
						before
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
