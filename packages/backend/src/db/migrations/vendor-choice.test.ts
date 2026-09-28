/**
 * Migration 4, on every engine: adds exactly the column it claims to, can be
 * re-run, and leaves everything earlier migrations produced alone.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import { up as receipts } from './3-consent-receipts-and-privacy-directives';
import { up as vendors } from './4-vendor-choice';

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

for (const engine of ENGINES) {
	describe(`vendor choice migration on ${engine.name}`, () => {
		it.effect(
			'adds the vendorChoice column and nothing else',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					yield* receipts;
					const before = yield* columnsOf('consent');
					assert.notInclude(before, 'vendorChoice');

					yield* vendors;

					const after = yield* columnsOf('consent');
					assert.include(after, 'vendorChoice');
					assert.deepStrictEqual(
						after.filter((column) => column !== 'vendorChoice'),
						before
					);
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
					yield* vendors;
					yield* vendors;
					const consent = yield* columnsOf('consent');
					assert.strictEqual(
						consent.filter((column) => column === 'vendorChoice').length,
						1
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
