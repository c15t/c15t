/**
 * Makes `runtimePolicyDecision.jurisdiction` nullable.
 *
 * 2.x recorded a regulation label ("GDPR", "CCPA", …) with every runtime
 * decision, derived from a fixed country table. v3 decides from policy rules
 * and no longer derives the label, so new decisions write `null`. Rows from
 * 2.x keep their value. `consent.jurisdiction` was always nullable.
 *
 * The baseline stays frozen at the 2.0.0 shape, as with migrations 3 and 6:
 * a fresh install creates the column `not null` and this relaxes it.
 *
 * - Postgres: `drop not null`, a catalog-only change.
 * - MySQL: `modify` with the column's current definition, read back from
 *   `show create table` with only `not null` changed, so an adopted
 *   database keeps its type, character set, collation, default and comment.
 *   `modify` replaces the whole definition, so any part left out is lost.
 * - SQLite has no way to alter a column's nullability, so the table is
 *   rebuilt: SQLite's own procedure, from the table's stored `create table`
 *   statement with only `not null` removed from this column. Starting from
 *   the stored statement rather than `TABLES` keeps whatever shape the
 *   database already has, including one adopted from 2.x. Foreign keys are
 *   off during the rebuild because `consent.runtimePolicyDecisionId`
 *   references this table. Dropping the table drops its indexes and
 *   triggers, so both are recreated from their stored statements. The
 *   rename uses SQLite's legacy behaviour, so views and other tables'
 *   triggers that name the table do not block it.
 *
 * Idempotent. Each engine checks the column's nullability first. The SQLite
 * rebuild runs in one transaction, so an interrupted run leaves no copy
 * behind; a table already using the copy's name is never dropped, and the
 * migration stops instead.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from '../dialect';

export const DECISION_TABLE = 'runtimePolicyDecision';
export const JURISDICTION_COLUMN = 'jurisdiction';

const REBUILD_TABLE = `${DECISION_TABLE}_migration_7`;

/** `create table [if not exists] <name>` with any identifier quoting. */
const CREATE_TABLE_NAME =
	/^\s*create\s+table\s+(?:if\s+not\s+exists\s+)?["`[]?runtimePolicyDecision["`\]]?/iu;

/**
 * The `jurisdiction` column definition up to its `not null`. Stops at the
 * next comma, so it cannot reach into another column's definition.
 */
const JURISDICTION_NOT_NULL =
	/(?<column>(?:^|[(,])\s*["`[]?jurisdiction["`\]]?\s[^,]*?)\s+not\s+null\b/iu;

/**
 * The stored `create table` statement, renamed and with `jurisdiction`
 * nullable. Throws when the statement does not have the expected shape
 * rather than rebuilding the table from a guess. Exported for tests.
 *
 * @internal
 */
export const relaxJurisdictionSql = function relaxJurisdictionSql(
	createSql: string,
	tableName: string
): string {
	if (!CREATE_TABLE_NAME.test(createSql)) {
		throw new Error(
			`migration 7: unexpected create statement for ${DECISION_TABLE}`
		);
	}
	if (!JURISDICTION_NOT_NULL.test(createSql)) {
		throw new Error(
			`migration 7: no not-null ${JURISDICTION_COLUMN} column in ${DECISION_TABLE}`
		);
	}
	return (
		createSql
			// No `if not exists`: the copy must be a new table, never one that
			// happens to share its name.
			.replace(CREATE_TABLE_NAME, `create table "${tableName}"`)
			.replace(JURISDICTION_NOT_NULL, '$<column>')
	);
};

/** The `jurisdiction` line of a MySQL `show create table` result. */
const MYSQL_JURISDICTION_LINE = /^\s*`jurisdiction`\s.*$/mu;

/**
 * The `jurisdiction` column definition from a MySQL `show create table`
 * result, with `NOT NULL` changed to `NULL`. MySQL prints the attributes in a
 * fixed order (type, character set, collation, nullability, default,
 * comment), so the first `NOT NULL` is the column's own. Throws when the
 * column is missing or not `NOT NULL` rather than guessing. Exported for
 * tests.
 *
 * @internal
 */
export const relaxMysqlJurisdictionColumn =
	function relaxMysqlJurisdictionColumn(createTable: string): string {
		const line = MYSQL_JURISDICTION_LINE.exec(createTable)?.[0]
			.trim()
			.replace(/,$/u, '');
		if (line === undefined || !/\sNOT NULL\b/iu.test(line)) {
			throw new Error(
				`migration 7: no not-null ${JURISDICTION_COLUMN} column in ${DECISION_TABLE}`
			);
		}
		return line.replace(/\sNOT NULL\b/iu, ' NULL');
	};

const isNullable = Effect.fn('migration.jurisdictionNullable')(
	function* isNullable() {
		const sql = yield* SqlClient.SqlClient;
		const rows = yield* sql.onDialectOrElse({
			mysql: () =>
				sql<{ nullable: string }>`
					select is_nullable as nullable from information_schema.columns
					where table_schema = database()
						and table_name = ${DECISION_TABLE}
						and column_name = ${JURISDICTION_COLUMN}
				`,
			orElse: () =>
				sql<{ nullable: string }>`
					select is_nullable as nullable from information_schema.columns
					where table_schema = current_schema()
						and table_name = ${DECISION_TABLE}
						and column_name = ${JURISDICTION_COLUMN}
				`,
			sqlite: () =>
				sql<{ nullable: string }>`
					select case when "notnull" = 0 then 'YES' else 'NO' end as nullable
					from pragma_table_info(${DECISION_TABLE})
					where name = ${JURISDICTION_COLUMN}
				`,
		});
		// No column at all is nothing to relax.
		return rows.length === 0 || rows[0]?.nullable === 'YES';
	}
);

const relaxMysql = Effect.gen(function* relaxMysql() {
	const sql = yield* SqlClient.SqlClient;
	const quote = Dialect.escaperFor('mysql');
	const rows = yield* sql.unsafe<Record<string, unknown>>(
		`show create table ${quote(DECISION_TABLE)}`
	);
	const createTable = rows[0]?.['Create Table'];
	if (typeof createTable !== 'string') {
		return yield* Effect.die(
			new Error(`migration 7: could not read ${DECISION_TABLE}'s definition`)
		);
	}
	const column = relaxMysqlJurisdictionColumn(createTable);
	yield* sql.unsafe(`alter table ${quote(DECISION_TABLE)} modify ${column}`);
});

const rebuildSqlite = Effect.gen(function* rebuildSqlite() {
	const sql = yield* SqlClient.SqlClient;
	const quote = Dialect.escaperFor('sqlite');

	const tables = yield* sql<{ sql: string }>`
		select sql from sqlite_master
		where type = 'table' and name = ${DECISION_TABLE}
	`;
	const createSql = tables[0]?.sql;
	if (createSql === undefined) {
		return;
	}
	// Indexes before triggers, so a trigger never runs against a table
	// missing an index it relies on.
	const attached = yield* sql<{ sql: string }>`
		select sql from sqlite_master
		where type in ('index', 'trigger')
			and tbl_name = ${DECISION_TABLE}
			and sql is not null
		order by type = 'trigger'
	`;
	const relaxed = relaxJurisdictionSql(createSql, REBUILD_TABLE);
	const taken = yield* sql<{ name: string }>`
		select name from sqlite_master where name = ${REBUILD_TABLE}
	`;
	if (taken.length > 0) {
		return yield* Effect.die(
			new Error(
				`migration 7: ${REBUILD_TABLE} already exists. It is not a c15t table; rename it and run the migration again.`
			)
		);
	}

	// Foreign key violations that involve this table. Counted before and
	// after, so an orphan the database already had elsewhere, or one already
	// pointing here, does not block the upgrade; only new ones do.
	const decisionViolations = sql<{ count: number }>`
		select count(*) as count from pragma_foreign_key_check()
		where "table" = ${DECISION_TABLE} or parent = ${DECISION_TABLE}
	`.pipe(Effect.map((rows) => Number(rows[0]?.count ?? 0)));
	const violationsBefore = yield* decisionViolations;

	const [foreignKeys] = yield* sql<{ foreign_keys: number }>`
		pragma foreign_keys
	`;
	const [legacyAlter] = yield* sql<{ legacy_alter_table: number }>`
		pragma legacy_alter_table
	`;
	// Has no effect inside a transaction, so it is switched outside one.
	yield* sql.unsafe('pragma foreign_keys = off');
	// Views and other tables' triggers that name the table are invalid while
	// it is dropped, and the default rename checks the whole schema, so it
	// would fail. The legacy rename skips that check; those objects name the
	// table, so they resolve to the rebuilt one afterwards.
	yield* sql.unsafe('pragma legacy_alter_table = on');

	yield* Effect.gen(function* rebuild() {
		yield* sql.unsafe(relaxed);
		yield* sql.unsafe(
			`insert into ${quote(REBUILD_TABLE)} select * from ${quote(
				DECISION_TABLE
			)}`
		);
		yield* sql.unsafe(`drop table ${quote(DECISION_TABLE)}`);
		yield* sql.unsafe(
			`alter table ${quote(REBUILD_TABLE)} rename to ${quote(DECISION_TABLE)}`
		);
		for (const statement of attached) {
			yield* sql.unsafe(statement.sql);
		}
		const violationsAfter = yield* decisionViolations;
		if (violationsAfter > violationsBefore) {
			return yield* Effect.die(
				new Error(
					`migration 7: rebuilding ${DECISION_TABLE} added ${violationsAfter - violationsBefore} foreign key violations`
				)
			);
		}
	}).pipe(
		sql.withTransaction,
		Effect.ensuring(
			Effect.all([
				sql.unsafe(
					`pragma legacy_alter_table = ${legacyAlter?.legacy_alter_table ? 'on' : 'off'}`
				),
				sql.unsafe(
					`pragma foreign_keys = ${foreignKeys?.foreign_keys ? 'on' : 'off'}`
				),
			]).pipe(Effect.orDie)
		)
	);
});

export const up = Effect.gen(function* up() {
	if (yield* isNullable()) {
		return;
	}
	const sql = yield* SqlClient.SqlClient;
	const quote = Dialect.escaperFor(yield* Dialect.current);
	yield* sql.onDialectOrElse({
		mysql: () => relaxMysql,
		orElse: () =>
			sql.unsafe(
				`alter table ${quote(DECISION_TABLE)} alter column ${quote(
					JURISDICTION_COLUMN
				)} drop not null`
			),
		sqlite: () => rebuildSqlite,
	});
});
