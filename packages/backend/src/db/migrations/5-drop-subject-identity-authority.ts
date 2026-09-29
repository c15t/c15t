/**
 * Drops `subject.identityAuthority`.
 *
 * 3.0.0-alpha.0 to alpha.3 added the column in migration 3. It recorded
 * whether an authenticated caller or the subject's own browser linked a
 * subject to its external identity, so the backend could decide which stored
 * Global Privacy Control opt-outs the subject could read. v3 no longer stores
 * GPC opt-outs, so nothing reads the column, and migration 3 no longer adds
 * it. This removes it from databases that ran the earlier version.
 *
 * The `privacyDirective` table from the same alpha migration is left alone.
 * It is unused, but it may hold rows, and a migrator should not drop a table
 * of recorded data as a side effect of an upgrade.
 *
 * Idempotent. A fresh install never had the column, and a re-run after it is
 * gone does nothing. SQLite supports `drop column` from 3.35; the
 * `node:sqlite` driver bundles a newer version.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import * as Dialect from '../dialect';

/** The column this migration removes. */
export const SUBJECT_IDENTITY_AUTHORITY_COLUMN = 'identityAuthority';

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
	const quote = Dialect.escaperFor(yield* Dialect.current);

	if (yield* columnExists('subject', SUBJECT_IDENTITY_AUTHORITY_COLUMN)) {
		yield* sql.unsafe(
			`alter table ${quote('subject')} drop column ${quote(
				SUBJECT_IDENTITY_AUTHORITY_COLUMN
			)}`
		);
	}
});
