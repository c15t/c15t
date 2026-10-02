/**
 * Schema drift the migrator can see but does not repair.
 *
 * A database the migrator created or adopted has the shape the backend
 * expects. One changed by hand afterwards may not, and the backend only finds
 * out on the write that needs the missing piece. Reporting it from
 * `migrate --plan` puts it in front of the operator at deploy time instead.
 *
 * Nothing here changes the database. Each fix touches existing rows (a unique
 * index fails if duplicates exist), so it is the operator's to run.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from './dialect';

const DECISION_TABLE = 'runtimePolicyDecision';
const DEDUPE_COLUMN = 'dedupeKey';

/**
 * The warning for a `runtimePolicyDecision` without a unique index on
 * `dedupeKey` alone.
 *
 * A composite such as `(tenantId, dedupeKey)` does not count: `tenantId` is
 * NULL for single-tenant deployments, and SQL treats NULLs as distinct in a
 * unique index, so the composite never deduplicates them. The tenant is
 * already part of the key's value, so `dedupeKey` alone is the right scope.
 */
export const missingDedupeIndex = function missingDedupeIndex(
	quote: (name: string) => string
): string {
	return `${DECISION_TABLE} has no unique index on ${DEDUPE_COLUMN} alone, so repeated policy decisions are stored as separate rows. Check for duplicate ${DEDUPE_COLUMN} values, then run: create unique index ${quote(
		`${DECISION_TABLE}_${DEDUPE_COLUMN}_key`
	)} on ${quote(DECISION_TABLE)} (${quote(DEDUPE_COLUMN)})`;
};

const tableExists = Effect.gen(function* tableExists() {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = database() and table_name = ${DECISION_TABLE}
			`,
		orElse: () =>
			sql<{ name: string }>`
				select table_name as name from information_schema.tables
				where table_schema = current_schema() and table_name = ${DECISION_TABLE}
			`,
		sqlite: () =>
			sql<{ name: string }>`
				select name from sqlite_master
				where type = 'table' and name = ${DECISION_TABLE}
			`,
	});
	return rows.length > 0;
});

/**
 * The column lists of every full (non-partial) unique index on the decision
 * table, each joined with commas in index order. Unique constraints count:
 * every engine backs them with a unique index.
 */
const uniqueIndexColumns = Effect.gen(function* uniqueIndexColumns() {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql.onDialectOrElse({
		mysql: () =>
			sql<{ columns: string }>`
				select group_concat(column_name order by seq_in_index) as columns
				from information_schema.statistics
				where table_schema = database()
					and table_name = ${DECISION_TABLE}
					and non_unique = 0
				group by index_name
			`,
		orElse: () =>
			sql<{ columns: string }>`
				select string_agg(a.attname, ',' order by k.ord) as columns
				from pg_index i
				join pg_class t on t.oid = i.indrelid
				join pg_namespace n on n.oid = t.relnamespace
				cross join lateral unnest(i.indkey) with ordinality as k(attnum, ord)
				join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
				where n.nspname = current_schema()
					and t.relname = ${DECISION_TABLE}
					and i.indisunique
					and i.indpred is null
				group by i.indexrelid
			`,
		sqlite: () =>
			sql<{ columns: string }>`
				select group_concat(ii.name) as columns
				from pragma_index_list(${DECISION_TABLE}) il,
					pragma_index_info(il.name) ii
				where il."unique" = 1 and il.partial = 0
				group by il.name
			`,
	});
	return rows.map((row) => row.columns);
});

/**
 * Drift the backend depends on, as operator-facing messages. Empty when the
 * schema matches, and when the tables do not exist yet: the migration that
 * creates them creates them correctly.
 */
export const findSchemaDrift = Effect.gen(function* findSchemaDrift() {
	if (!(yield* tableExists)) {
		return [] as readonly string[];
	}
	const indexes = yield* uniqueIndexColumns;
	const drift: string[] = [];
	if (!indexes.includes(DEDUPE_COLUMN)) {
		drift.push(missingDedupeIndex(Dialect.escaperFor(yield* Dialect.current)));
	}
	return drift as readonly string[];
});
