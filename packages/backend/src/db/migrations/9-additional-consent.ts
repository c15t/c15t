/**
 * Adds `consent.addtlConsent`.
 *
 * Google's Additional Consent string records consent for the ad tech
 * providers Google lists outside the IAB Global Vendor List. It travels with
 * the TC string, so it is stored on the same row: the pair is the evidence of
 * what one act granted, and an AC string read without its TC string means
 * nothing.
 *
 * Nothing is backfilled. Consents recorded before this migration never sent
 * the string, so they hold null.
 *
 * No index: nothing filters on it. `text` like `tcString`, since a string
 * with many providers can run past `varchar(255)`.
 *
 * Idempotent. The column is checked before it is added.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from '../dialect';
import { addColumnSql } from '../schema';
import type { ColumnSpec } from '../schema';

export const ADDITIONAL_CONSENT_COLUMN: ColumnSpec = {
	name: 'addtlConsent',
	nullable: true,
	type: 'text',
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

	if (yield* columnExists('consent', ADDITIONAL_CONSENT_COLUMN.name)) {
		return;
	}
	yield* sql.unsafe(
		addColumnSql(
			'consent',
			ADDITIONAL_CONSENT_COLUMN,
			Dialect.typesFor(dialect),
			Dialect.escaperFor(dialect)
		)
	);
});
