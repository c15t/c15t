/**
 * Experiment attribution as real columns.
 *
 * A v3 client that runs a banner experiment sends the arm on every consent
 * as `metadata.experiment = { id, variant, … }` and the decision latency as
 * `metadata.timeToDecisionMs`. Both land in `consent.metadata`, a free-form
 * JSON column, which is right for an audit trail and useless for a report:
 * JSON path syntax is different on every engine c15t supports, and none of
 * them will index a path inside a `json` or `text` column without engine-
 * specific generated columns.
 *
 * So the three values that `GET /experiments/:id/summary` groups and orders
 * on are copied onto their own columns at write time, next to `uiSource` and
 * `consentAction`, which the same query also groups by. `metadata` keeps the
 * full object, untouched; these are a projection of it, not a replacement.
 *
 * - `experimentId`, `experimentVariant`: `indexedText`, because the summary
 *   query filters on the first and groups by both. On MySQL that has to be
 *   `varchar`, which is the whole reason the logical type exists.
 * - `timeToDecisionMs`: the first `integer` column in the schema. A text
 *   column would sort `"1000"` before `"200"`, and the median is computed
 *   from an ordered scan.
 * - a composite index on `(experimentId, experimentVariant)`, which is the
 *   shape of the summary query's `where … group by`. `tenantId` is already
 *   indexed by `2-hot-path-indexes`.
 *
 * Rows written before this migration keep their attribution inside
 * `metadata` only; nothing is backfilled. The summary counts what has a
 * column value, which is every consent recorded after the upgrade.
 *
 * The baseline stays frozen, as with migration 3: a fresh install and an
 * adopted database both reach the 2.0.0 shape first and gain these after.
 *
 * Idempotent. Each column and the index are checked before they are created,
 * so a re-run after a partial apply completes rather than failing on the
 * half that already landed.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import * as Dialect from '../dialect';
import { addColumnSql } from '../schema';
import type { ColumnSpec } from '../schema';

/** The three attribution columns, in the order they are added. */
export const EXPERIMENT_ATTRIBUTION_COLUMNS: readonly ColumnSpec[] = [
	{ name: 'experimentId', nullable: true, type: 'indexedText' },
	{ name: 'experimentVariant', nullable: true, type: 'indexedText' },
	{ name: 'timeToDecisionMs', nullable: true, type: 'integer' },
];

interface IndexSpec {
	readonly name: string;
	readonly table: string;
	readonly columns: readonly string[];
}

export const EXPERIMENT_ATTRIBUTION_INDEX: IndexSpec = {
	columns: ['experimentId', 'experimentVariant'],
	name: 'c15t_consent_experimentId_experimentVariant_idx',
	table: 'consent',
};

/**
 * Whether a column already exists.
 *
 * Asked before altering rather than altering and swallowing the error: on
 * Postgres a failed statement poisons the enclosing transaction, and SQLite's
 * driver caches failed prepared statements by text.
 */
const columnExists = Effect.fn('migration.columnExists')(function* columnExists(
	table: string,
	column: string
) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
					select column_name as name from information_schema.columns
					where table_schema = database()
						and table_name = ${table} and column_name = ${column}
				`,
		orElse: () =>
			sql<{ name: string }>`
					select column_name as name from information_schema.columns
					where table_schema = current_schema()
						and table_name = ${table} and column_name = ${column}
				`,
		sqlite: () =>
			sql<{ name: string }>`
					select name from pragma_table_info(${table}) where name = ${column}
				`,
	});
	return rows.length > 0;
});

const indexExists = Effect.fn('migration.indexExists')(function* indexExists(
	index: IndexSpec
) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
					select index_name as name from information_schema.statistics
					where table_schema = database()
						and table_name = ${index.table} and index_name = ${index.name}
				`,
		orElse: () =>
			sql<{ name: string }>`
					select indexname as name from pg_indexes
					where schemaname = current_schema() and indexname = ${index.name}
				`,
		sqlite: () =>
			sql<{ name: string }>`
					select name from sqlite_master
					where type = 'index' and name = ${index.name}
				`,
	});
	return rows.length > 0;
});

export const up = Effect.gen(function* up() {
	const sql = yield* SqlClient.SqlClient;
	const dialect = yield* Dialect.current;
	const types = Dialect.typesFor(dialect);
	const quote = Dialect.escaperFor(dialect);

	for (const column of EXPERIMENT_ATTRIBUTION_COLUMNS) {
		if (yield* columnExists('consent', column.name)) {
			continue;
		}
		yield* sql.unsafe(addColumnSql('consent', column, types, quote));
	}

	if (!(yield* indexExists(EXPERIMENT_ATTRIBUTION_INDEX))) {
		const index = EXPERIMENT_ATTRIBUTION_INDEX;
		yield* sql.unsafe(
			`create index ${quote(index.name)} on ${quote(index.table)} (${index.columns
				.map(quote)
				.join(', ')})`
		);
	}
});
