/**
 * Migration 4, on every engine.
 *
 * Three properties: it adds exactly the three columns and the composite index
 * it claims to; it can be re-run after a partial apply without failing on
 * what already landed; and it leaves the baseline's own shape alone.
 */

import { assert, describe, it } from '@effect/vitest';
import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { ENGINES, resetDatabase } from '../../__tests__/engines';
import { up as baseline } from './1-baseline';
import { up as indexes } from './2-hot-path-indexes';
import { up as receipts } from './3-consent-receipts-and-privacy-directives';
import {
	EXPERIMENT_ATTRIBUTION_COLUMNS,
	EXPERIMENT_ATTRIBUTION_INDEX,
	up as attribution,
} from './4-experiment-attribution';

const ADDED = EXPERIMENT_ATTRIBUTION_COLUMNS.map((column) => column.name);

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
	describe(`experiment attribution migration on ${engine.name}`, () => {
		it.effect(
			'adds the attribution columns and the composite index',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					yield* receipts;
					const before = yield* columnsOf('consent');
					for (const column of ADDED) {
						assert.notInclude(before, column);
					}

					yield* attribution;

					const after = yield* columnsOf('consent');
					for (const column of ADDED) {
						assert.include(after, column);
					}
					const names = yield* indexNames();
					assert.isTrue(
						names.has(EXPERIMENT_ATTRIBUTION_INDEX.name),
						`missing ${EXPERIMENT_ATTRIBUTION_INDEX.name}`
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);

		it.effect(
			'stores a whole number in timeToDecisionMs and orders it numerically',
			() =>
				Effect.gen(function* gen() {
					yield* resetDatabase;
					yield* baseline;
					yield* indexes;
					yield* receipts;
					yield* attribution;
					const sql = yield* SqlClient.SqlClient;

					// A text column would put 1000 before 200. The median in the
					// summary is read from an ordered scan, so the order matters.
					const now = yield* sql.onDialectOrElse({
						orElse: () => Effect.succeed<unknown>(new Date(0)),
						sqlite: () => Effect.succeed<unknown>(0),
					});
					yield* sql`insert into ${sql('subject')} ${sql.insert({
						createdAt: now,
						id: 'sub_1',
						updatedAt: now,
					})}`;
					yield* sql`insert into ${sql('domain')} ${sql.insert({
						createdAt: now,
						id: 'dom_1',
						name: 'example.com',
						updatedAt: now,
					})}`;
					for (const [id, ms] of [
						['cns_a', 1000],
						['cns_b', 200],
					] as const) {
						yield* sql`insert into ${sql('consent')} ${sql.insert({
							domainId: 'dom_1',
							givenAt: now,
							id,
							purposeIds: '[]',
							subjectId: 'sub_1',
							timeToDecisionMs: ms,
						})}`;
					}

					const rows = yield* sql<{ id: string }>`
						select ${sql('id')} from ${sql('consent')}
						order by ${sql('timeToDecisionMs')} asc
					`;
					assert.deepStrictEqual(
						rows.map((row) => row.id),
						['cns_b', 'cns_a']
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
					yield* attribution;
					// A second run must neither fail on the existing columns nor
					// add a second copy of anything.
					yield* attribution;

					const consent = yield* columnsOf('consent');
					for (const column of ADDED) {
						assert.strictEqual(
							consent.filter((name) => name === column).length,
							1
						);
					}
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
					yield* attribution;
					const after = yield* columnsOf('consent');
					assert.deepStrictEqual(
						after.filter(
							(column) => column !== 'choice' && !ADDED.includes(column)
						),
						before
					);
				}).pipe(Effect.provide(engine.layer)),
			{ timeout: 60_000 }
		);
	});
}
