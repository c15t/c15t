/** Add separate objection preference evidence without changing consent receipts. */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import * as Dialect from '../dialect';
import { addColumnSql } from '../schema';
import type { ColumnSpec } from '../schema';

/** Explicit exemption objections and reversals confirmed by one action. */
export const CONSENT_EXEMPTION_PREFERENCES_COLUMN: ColumnSpec = {
	name: 'exemptionPreferences',
	nullable: true,
	type: 'json',
};

const RUNTIME_POLICY_EXEMPTIONS_COLUMN: ColumnSpec = {
	name: 'exemptions',
	nullable: true,
	type: 'json',
};

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

export const up = Effect.gen(function* up() {
	const sql = yield* SqlClient.SqlClient;
	const dialect = yield* Dialect.current;
	const types = Dialect.typesFor(dialect);
	const quote = Dialect.escaperFor(dialect);

	if (
		!(yield* columnExists(
			'runtimePolicyDecision',
			RUNTIME_POLICY_EXEMPTIONS_COLUMN.name
		))
	) {
		yield* sql.unsafe(
			addColumnSql(
				'runtimePolicyDecision',
				RUNTIME_POLICY_EXEMPTIONS_COLUMN,
				types,
				quote
			)
		);
	}
	if (
		!(yield* columnExists('consent', CONSENT_EXEMPTION_PREFERENCES_COLUMN.name))
	) {
		yield* sql.unsafe(
			addColumnSql(
				'consent',
				CONSENT_EXEMPTION_PREFERENCES_COLUMN,
				types,
				quote
			)
		);
	}
});
