/**
 * Inserting a row that might already be there.
 *
 * Three write paths need the same guarantee — consent, subject and runtime
 * policy decision. Each has a deterministic primary key, so a retry, a
 * double-click, or two requests racing from the same visitor all compute the
 * *same* id. The insert must therefore succeed quietly when the row exists,
 * and still report which caller actually created it, because the audit entry
 * is written exactly once on the strength of that answer.
 *
 * ## Why this is not one statement for all three engines
 *
 * Postgres and SQLite express it directly:
 *
 * ```sql
 * insert into … on conflict ("id") do nothing returning "id"
 * ```
 *
 * MySQL 8 supports **neither** clause. `on conflict` is Postgres/SQLite
 * syntax, and `returning` is MariaDB's, not MySQL's. Its equivalent is
 * `insert ignore`, which reports the outcome out-of-band as `affectedRows`
 * rather than as a result set.
 *
 * So the shape of the answer genuinely differs per engine and the branch is
 * real rather than incidental. It is confined to this one function, and the
 * three call sites just get a boolean.
 *
 * ## Why not catch the duplicate-key error instead
 *
 * Effect normalises duplicate keys into `UniqueViolation` on all three
 * engines, so `insert` + `catch` would need no branch at all. It is still the
 * wrong choice here: on Postgres a failed statement poisons the enclosing
 * transaction, and every one of these inserts runs inside one. Recovering
 * would mean a `SAVEPOINT` and a `RELEASE` around each write — a round trip
 * added to the hottest path in the service to avoid a branch in one file.
 *
 * The old `@c15t/backend` did read-then-write and then string-matched adapter
 * error codes (`23505`, `ER_DUP_ENTRY`, `SQLITE_CONSTRAINT…`) to decide
 * whether a failure was a duplicate. Both forms of that are gone: the database
 * decides, in one statement, and nothing parses an error message.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { encodeRow, encoder } from './values';

/**
 * How many rows MySQL actually wrote.
 *
 * `insert ignore` returns an OK packet rather than rows: 1 when it inserted,
 * 0 when it skipped a duplicate. Read defensively — this is driver-shaped
 * data crossing into typed code, and a missing field must read as "did not
 * insert" rather than throw.
 */
const affectedRows = (result: unknown): number =>
	typeof result === 'object' &&
	result !== null &&
	'affectedRows' in result &&
	typeof result.affectedRows === 'number'
		? result.affectedRows
		: 0;

export interface InsertOnceOptions {
	/** Table to insert into. */
	readonly into: string;
	/**
	 * The unique column that decides whether this is a duplicate.
	 *
	 * A single column, because every caller conflicts on exactly one: the
	 * deterministic primary key, or `dedupeKey`.
	 */
	readonly conflictOn: string;
	/** Column values. JSON columns must already be serialised. */
	readonly values: Record<string, unknown>;
}

/**
 * Inserts a row unless its unique column is already taken.
 *
 * @returns `true` when this call created the row, `false` when it already
 * existed — including when a concurrent request created it a moment earlier.
 *
 * @example
 * ```ts
 * const created = yield* insertOnce({
 * 	into: 'consent',
 * 	conflictOn: 'id',
 * 	values: { id, subjectId, givenAt },
 * });
 * ```
 */
export const insertOnce = Effect.fn('db.insertOnce')(function* (
	options: InsertOnceOptions
) {
	const sql = yield* SqlClient.SqlClient;
	const into = sql(options.into);
	// SQLite can bind neither a Date nor a boolean; see `./values.ts`.
	const values = sql.insert(encodeRow(yield* encoder, options.values));
	const conflictOn = sql(options.conflictOn);

	return yield* sql.onDialectOrElse({
		mysql: () =>
			Effect.map(
				sql`insert ignore into ${into} ${values}`.raw,
				(result) => affectedRows(result) > 0
			),
		orElse: () =>
			Effect.map(
				sql`
					insert into ${into} ${values}
					on conflict (${conflictOn}) do nothing
					returning ${conflictOn}
				`,
				(rows) => rows.length > 0
			),
	});
});
