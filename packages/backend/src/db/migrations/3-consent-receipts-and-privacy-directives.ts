/**
 * v3 consent receipts (#1025).
 *
 * One additive change: `consent.choice`, a nullable JSON column holding the
 * per-category receipts a submission confirmed. A consent row is still one
 * append-only record of one act; the receipt on it covers exactly the
 * categories that act confirmed, so a partial save never renews a category it
 * did not mention. The latest receipt per category is derived on read,
 * ordered by `givenAt`, never rewritten in place.
 *
 * The file name is historical. 3.0.0-alpha.0 to alpha.3 shipped an earlier
 * version of this migration that also created a `privacyDirective` table with
 * three indexes and added `subject.identityAuthority`, for storing Global
 * Privacy Control opt-outs. v3 dropped that feature: GPC is read live from
 * the browser and never stored. This migration no longer creates either.
 * Migration 5 drops the column from databases that have it. The table is
 * left in place on alpha databases: nothing reads or writes it, and dropping
 * a table is not something a migrator should do to data it did not ask about.
 *
 * The baseline stays frozen: this is migration 3, applied after adoption like
 * the hot-path indexes, so a fresh install and an adopted database still
 * converge on the same 2.0.0 shape before either gains the column.
 *
 * Idempotent. The column is checked before it is added, so a re-run after a
 * partial apply completes instead of failing on the half that already landed.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from '../dialect';
import { addColumnSql } from '../schema';
import type { ColumnSpec } from '../schema';

/** Receipts confirmed by one submission, as the v3 wire carries them. */
export const CONSENT_CHOICE_COLUMN: ColumnSpec = {
	name: 'choice',
	nullable: true,
	type: 'json',
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
});
