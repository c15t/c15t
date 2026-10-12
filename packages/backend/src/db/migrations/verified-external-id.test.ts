/**
 * Migration 8, on every engine: it adds `subject.verifiedExternalId`, leaves
 * existing links unverified, and a re-run does nothing.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import { encodeRow, encoder } from '../values';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import {
	VERIFIED_EXTERNAL_ID_COLUMN,
	up as verifiedExternalId,
} from './8-verified-external-id';

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
	describe(`verified external id migration on ${engine.name}`, () => {
		it.effect(
			'adds the column and leaves existing links unverified',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					const sql = yield* SqlClient.SqlClient;
					const now = new Date(1_800_000_000_000);
					yield* sql`insert into ${sql('subject')} ${sql.insert(
						encodeRow(yield* encoder, {
							createdAt: now,
							externalId: 'ext_before',
							id: 'sub_before',
							updatedAt: now,
						})
					)}`;

					yield* verifiedExternalId;
					// A re-run after a partial apply must not fail on the column.
					yield* verifiedExternalId;

					assert.include(
						yield* columnsOf('subject'),
						VERIFIED_EXTERNAL_ID_COLUMN.name
					);
					// Nothing proved this link, so the migration must not vouch for it.
					const rows = yield* sql<{ verifiedExternalId: string | null }>`
						select ${sql('verifiedExternalId')} from ${sql('subject')}
						where ${sql('id')} = ${'sub_before'}
					`;
					assert.isNull(rows[0]?.verifiedExternalId ?? null);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
