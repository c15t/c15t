/**
 * Vendor-level consent outside IAB (#1034).
 *
 * One additive change: `consent.vendorChoice`, a nullable JSON column holding
 * the per-vendor grant map a submission carried. The map lists every vendor
 * the client knew about at save time with its granted flag and one
 * confirmation time, so the backend stores the complete vendor decision
 * without knowing the vendor list. The newest map across a subject's rows is
 * derived on read, never rewritten in place.
 *
 * Migration 4 sits after the receipts migration for the same reason that one
 * sits after the hot-path indexes: the baseline stays frozen, and a fresh
 * install and an adopted database converge on the same shape before either
 * gains the column.
 *
 * Idempotent. The column is checked before it is added, so a re-run after a
 * partial apply completes instead of failing on the half that already landed.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import * as Dialect from '../dialect';
import { addColumnSql } from '../schema';
import type { ColumnSpec } from '../schema';

/** Per-vendor grants one submission carried, as the wire carries them. */
export const CONSENT_VENDOR_CHOICE_COLUMN: ColumnSpec = {
	name: 'vendorChoice',
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

	if (!(yield* columnExists('consent', CONSENT_VENDOR_CHOICE_COLUMN.name))) {
		yield* sql.unsafe(
			addColumnSql('consent', CONSENT_VENDOR_CHOICE_COLUMN, types, quote)
		);
	}
});
