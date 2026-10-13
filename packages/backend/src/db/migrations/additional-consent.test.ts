/**
 * Migration 9, on every engine: it adds `consent.addtlConsent`, and a re-run
 * does nothing.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import {
	ADDITIONAL_CONSENT_COLUMN,
	up as additionalConsent,
} from './9-additional-consent';

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
	return rows.map((row) => row.name);
});

for (const engine of ENGINES) {
	describe(`additional consent migration on ${engine.name}`, () => {
		it.effect(
			'adds the column once',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;

					yield* additionalConsent;
					// A re-run after a partial apply must not fail on the column.
					yield* additionalConsent;

					assert.include(
						yield* columnsOf('consent'),
						ADDITIONAL_CONSENT_COLUMN.name
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
