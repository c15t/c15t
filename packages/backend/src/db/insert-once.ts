/**
 * Inserts once inside the caller's transaction. Postgres and SQLite use
 * ON CONFLICT with RETURNING. MySQL recovers only duplicate-key failures;
 * other database errors still fail the write.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/sql';
import type { SqlError } from 'effect/sql';

import { encodeRow, encoder } from './values';

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
	/**
	 * When no unique index covers exactly `conflictOn`, treat a conflict on
	 * any unique index as the duplicate instead of failing.
	 *
	 * Postgres and SQLite reject `on conflict (col)` outright when no unique
	 * index covers exactly that column, so a database whose index differs from
	 * the one the migrator creates fails every insert. With this set, that
	 * rejection is retried as `on conflict do nothing` with no target. A
	 * schema with the expected index never takes the retry, so it keeps the
	 * targeted statement, which also tolerates unrelated deferrable unique
	 * constraints that a targetless one cannot.
	 *
	 * Use it only for a table whose other unique indexes cannot collide, or a
	 * real conflict on one of them is reported as a duplicate. MySQL already
	 * behaves this way. The retry follows a failed statement, which aborts an
	 * enclosing Postgres transaction, so use it only outside one.
	 */
	readonly fallbackToAnyUnique?: boolean;
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
/**
 * Whether the database rejected an `on conflict (col)` target because no
 * unique index covers exactly that column: SQLSTATE 42P10 on Postgres, a
 * plain error with a fixed message on SQLite.
 */
const isMissingConflictTarget = (error: SqlError.SqlError): boolean => {
	const cause: unknown = error.reason.cause;
	if (typeof cause !== 'object' || cause === null) {
		return false;
	}
	if ('code' in cause && cause.code === '42P10') {
		return true;
	}
	return (
		'message' in cause &&
		typeof cause.message === 'string' &&
		cause.message.includes(
			'ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint'
		)
	);
};

export const insertOnce = Effect.fn('db.insertOnce')(function* insertOnce(
	options: InsertOnceOptions
) {
	const sql = yield* SqlClient.SqlClient;
	const into = sql(options.into);
	// SQLite can bind neither a Date nor a boolean; see `./values.ts`.
	const values = sql.insert(encodeRow(yield* encoder, options.values));
	const conflictOn = sql(options.conflictOn);

	return yield* sql.onDialectOrElse({
		mysql: () =>
			// A plain insert, with only the duplicate recovered.
			//
			// `insert ignore` was the obvious equivalent and is the wrong one: it
			// downgrades *every* error to a warning, so a varchar overflow or a
			// bad date silently truncates on MySQL while the same row errors on
			// Postgres and SQLite. The engines would then disagree about what was
			// stored rather than merely about syntax.
			//
			// `on duplicate key update <col> = <col>` narrows that correctly but
			// cannot be read back: mysql2 connects with CLIENT_FOUND_ROWS, so
			// `affectedRows` is 1 for both a fresh insert and a matched duplicate.
			// Measured — the cross-tenant subject test passed on three engines and
			// failed on MySQL because every call reported "created".
			//
			// So the duplicate is caught. The objection recorded above is specific
			// to Postgres, where a failed statement poisons the enclosing
			// transaction; MySQL rolls back only the statement, so there is no
			// savepoint to pay for here. Any other failure propagates untouched.
			sql`insert into ${into} ${values}`.raw.pipe(
				Effect.as(true),
				Effect.catchTag('SqlError', (error: SqlError.SqlError) =>
					error.reason._tag === 'UniqueViolation'
						? Effect.succeed(false)
						: Effect.fail(error)
				)
			),
		orElse: () => {
			const targeted = sql`
				insert into ${into} ${values}
				on conflict (${conflictOn}) do nothing
				returning ${conflictOn}
			`;
			const anyUnique = sql`
				insert into ${into} ${values}
				on conflict do nothing
				returning ${conflictOn}
			`;
			return Effect.map(
				options.fallbackToAnyUnique === true
					? targeted.pipe(
							Effect.catchIf(isMissingConflictTarget, () => anyUnique)
						)
					: targeted,
				(rows) => rows.length > 0
			);
		},
	});
});
