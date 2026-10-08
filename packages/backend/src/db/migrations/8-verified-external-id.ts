/**
 * Adds `subject.verifiedExternalId`.
 *
 * `subject.externalId` is whatever the caller sent, and until now any browser
 * could send any value. The new column holds the external id the backend
 * verified, through an API key or a signed identity token. Reads that answer
 * "what did this user consent to" (`GET /subjects?externalId=`,
 * `GET /consents/check`) count a subject only when the two columns match.
 *
 * The verified value is stored rather than a flag. A 2.x backend sharing the
 * database still rewrites `externalId` without knowing this column exists,
 * and a flag would then vouch for an identity nobody verified. With the
 * value, that rewrite leaves the columns unequal and the subject unverified.
 *
 * Migration 5 dropped `identityAuthority`, an earlier flag for a related
 * purpose. This is a new column with a new meaning, not that one restored.
 *
 * Nothing is backfilled. Links made before this migration were never
 * verified, so they stay unverified until the customer's server relinks
 * them with an API key or the browser sends a token.
 *
 * No index: both reads already filter on the indexed `externalId` first.
 *
 * Idempotent. The column is checked before it is added.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';

import * as Dialect from '../dialect';
import { addColumnSql } from '../schema';
import type { ColumnSpec } from '../schema';

export const VERIFIED_EXTERNAL_ID_COLUMN: ColumnSpec = {
	name: 'verifiedExternalId',
	nullable: true,
	type: 'indexedText',
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

	if (yield* columnExists('subject', VERIFIED_EXTERNAL_ID_COLUMN.name)) {
		return;
	}
	yield* sql.unsafe(
		addColumnSql(
			'subject',
			VERIFIED_EXTERNAL_ID_COLUMN,
			Dialect.typesFor(dialect),
			Dialect.escaperFor(dialect)
		)
	);
});
