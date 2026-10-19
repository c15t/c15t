/**
 * Adds `consent.scripts`.
 *
 * The scripts the page had configured when the subject acted, each with
 * only the fields that decide whether it may run: category condition,
 * vendor, IAB requirements and loading flags. Each entry also carries
 * `allowed`, whether the recorded consent permitted it, which the backend
 * works out at save time (see `http/script-permissions.ts`).
 *
 * Nothing is backfilled. Consents recorded before this migration, or by a
 * client that does not send the list, hold null.
 *
 * No index: nothing filters on it.
 *
 * Idempotent. The column is checked before it is added.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from '../dialect';
import { addColumnSql } from '../schema';
import type { ColumnSpec } from '../schema';

/** Configured scripts one submission carried, each with `allowed`. */
export const CONSENT_SCRIPTS_COLUMN: ColumnSpec = {
	name: 'scripts',
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

	if (yield* columnExists('consent', CONSENT_SCRIPTS_COLUMN.name)) {
		return;
	}
	yield* sql.unsafe(
		addColumnSql(
			'consent',
			CONSENT_SCRIPTS_COLUMN,
			Dialect.typesFor(dialect),
			Dialect.escaperFor(dialect)
		)
	);
});
