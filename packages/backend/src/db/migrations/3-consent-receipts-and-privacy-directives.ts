/**
 * v3 consent receipts and standing privacy directives (#1025).
 *
 * Two additive changes, neither of which touches an existing column:
 *
 * - `consent.choice`, a nullable JSON column holding the per-category
 *   receipts a submission confirmed. A consent row is still one append-only
 *   record of one act; the receipt on it covers exactly the categories that
 *   act confirmed, so a partial save never renews a category it did not
 *   mention. The latest receipt per category is derived on read, ordered by
 *   `givenAt`, never rewritten in place.
 * - `privacyDirective`, a table for opt-out directives recorded from a
 *   user-agent signal such as Global Privacy Control. A directive is a
 *   privacy request, not a consent record: it has no policy, no purposes and
 *   no `consent_given` audit entry, and a later consent save never deletes or
 *   overrides it. `authority` records who asserted it: `subject` when the
 *   subject's own device wrote it for itself, `api` when an authenticated
 *   caller asserted it for an external identity. Only `api` directives may
 *   apply beyond the subject they were recorded on. No client IP or user
 *   agent is stored on a directive: it holds the association, authority,
 *   source, categories and times, and nothing else.
 *
 * A third column, `subject.identityAuthority`, records who linked a subject
 * to its external identity: `api` when an authenticated caller did, `browser`
 * when the subject's own device did through the public routes. Existing
 * links stay `NULL`, which reads as untrusted; nothing is retroactively
 * trusted. Only an `api` link lets a subject read identity-level directives.
 *
 * The baseline stays frozen: this is migration 3, applied after adoption like
 * the hot-path indexes, so a fresh install and an adopted database still
 * converge on the same 2.0.0 shape before either gains these.
 *
 * Idempotent. The column and table are checked before they are created, so a
 * re-run after a partial apply completes instead of failing on the half that
 * already landed.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import * as Dialect from '../dialect';
import { addColumnSql, createTableSql } from '../schema';
import type { ColumnSpec, TableSpec } from '../schema';

/** Receipts confirmed by one submission, as the v3 wire carries them. */
export const CONSENT_CHOICE_COLUMN: ColumnSpec = {
	name: 'choice',
	nullable: true,
	type: 'json',
};

/** Who asserted the subject's external identity link. */
export const SUBJECT_IDENTITY_AUTHORITY_COLUMN: ColumnSpec = {
	name: 'identityAuthority',
	nullable: true,
	type: 'text',
};

export const PRIVACY_DIRECTIVE_TABLE: TableSpec = {
	columns: [
		{ name: 'id', nullable: false, type: 'id' },
		{ name: 'tenantId', nullable: true, type: 'indexedText' },
		{ name: 'subjectId', nullable: true, type: 'indexedText' },
		{ name: 'externalId', nullable: true, type: 'indexedText' },
		{ name: 'identityProvider', nullable: true, type: 'text' },
		{ name: 'authority', nullable: false, type: 'text' },
		{ name: 'source', nullable: false, type: 'text' },
		{ name: 'categories', nullable: false, type: 'json' },
		{ name: 'recordedAt', nullable: false, type: 'timestamp' },
		{ name: 'signalHeader', nullable: true, type: 'bool' },
		{ name: 'createdAt', nullable: false, type: 'timestamp' },
	],
	foreignKeys: [
		{ column: 'subjectId', referencesColumn: 'id', referencesTable: 'subject' },
	],
	name: 'privacyDirective',
};

interface IndexSpec {
	readonly name: string;
	readonly table: string;
	readonly columns: readonly string[];
}

export const PRIVACY_DIRECTIVE_INDEXES: readonly IndexSpec[] = [
	{
		columns: ['subjectId'],
		name: 'c15t_privacyDirective_subjectId_idx',
		table: 'privacyDirective',
	},
	{
		columns: ['externalId'],
		name: 'c15t_privacyDirective_externalId_idx',
		table: 'privacyDirective',
	},
	{
		columns: ['tenantId'],
		name: 'c15t_privacyDirective_tenantId_idx',
		table: 'privacyDirective',
	},
];

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

	if (!(yield* columnExists('consent', CONSENT_CHOICE_COLUMN.name))) {
		yield* sql.unsafe(
			addColumnSql('consent', CONSENT_CHOICE_COLUMN, types, quote)
		);
	}

	if (
		!(yield* columnExists('subject', SUBJECT_IDENTITY_AUTHORITY_COLUMN.name))
	) {
		yield* sql.unsafe(
			addColumnSql('subject', SUBJECT_IDENTITY_AUTHORITY_COLUMN, types, quote)
		);
	}

	yield* sql.unsafe(createTableSql(PRIVACY_DIRECTIVE_TABLE, types, quote));

	for (const index of PRIVACY_DIRECTIVE_INDEXES) {
		if (yield* indexExists(index)) {
			continue;
		}
		yield* sql.unsafe(
			`create index ${quote(index.name)} on ${quote(index.table)} (${index.columns
				.map(quote)
				.join(', ')})`
		);
	}
});
