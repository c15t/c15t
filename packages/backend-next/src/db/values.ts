/**
 * Converting between JavaScript values and what each engine can actually
 * store.
 *
 * Postgres and MySQL drivers accept a `Date` and a `boolean` and do the right
 * thing. SQLite does not: `node:sqlite` binds only `null`, `number`, `bigint`,
 * `string` and `Uint8Array`, and rejects anything else outright —
 *
 * ```
 * TypeError: Provided value cannot be bound to SQLite parameter 3.
 * ```
 *
 * — which meant that until `repository/cross-engine.test.ts` existed, no write
 * in this package could reach a SQLite database. Every SQLite test covered
 * DDL and adoption, so the whole suite passed.
 *
 * ## The representation is not ours to choose
 *
 * `dialect.ts` maps SQLite timestamps to `integer` and booleans to `integer`
 * because that is what a real 2.0.0 SQLite database already holds. So this is
 * a translation to an existing format, not a storage decision: a `Date`
 * becomes epoch **milliseconds** and a `boolean` becomes `0` or `1`, and both
 * come back the same way.
 *
 * Reads therefore have to translate too, which is what `toDate` and friends
 * are for. They are written to accept either representation rather than to
 * assume SQLite, so one decoder serves all three engines and no read path has
 * to know which one it is talking to.
 */

import { Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

/** Encodes one value for the connected engine. */
export type Encoder = (value: unknown) => unknown;

const passthrough: Encoder = (value) => value;

const forSqlite: Encoder = (value) => {
	if (value instanceof Date) {
		// Milliseconds, matching what 2.0.0 SQLite databases hold. Seconds
		// would silently truncate, and a consent's id is derived from its
		// `givenAt` — a truncated round trip stops hashing to its own id.
		return value.getTime();
	}
	if (typeof value === 'boolean') {
		return value ? 1 : 0;
	}
	return value;
};

/**
 * The encoder for the connected engine.
 *
 * Resolved from the client rather than from configuration, so it cannot
 * disagree with the database actually in use.
 */
export const encoder: Effect.Effect<Encoder, never, SqlClient.SqlClient> =
	Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient;
		return yield* sql.onDialectOrElse({
			sqlite: () => Effect.succeed(forSqlite),
			orElse: () => Effect.succeed(passthrough),
		});
	});

/** Applies an encoder across a row of column values. */
export const encodeRow = (
	encode: Encoder,
	values: Record<string, unknown>
): Record<string, unknown> => {
	const encoded: Record<string, unknown> = {};
	for (const [column, value] of Object.entries(values)) {
		encoded[column] = encode(value);
	}
	return encoded;
};

/**
 * A timestamp column, whichever way the engine returned it.
 *
 * Postgres and MySQL hand back a `Date`; SQLite hands back epoch
 * milliseconds as a number.
 */
export const toDate = (value: unknown): Date =>
	value instanceof Date ? value : new Date(Number(value));

/** As `toDate`, preserving a genuinely absent value. */
export const toDateOrNull = (value: unknown): Date | null =>
	value === null || value === undefined ? null : toDate(value);

/**
 * A boolean column, whichever way the engine returned it.
 *
 * Postgres gives `true`/`false`, MySQL gives a `tinyint` `1`/`0`, SQLite gives
 * an `integer` `1`/`0`.
 */
export const toBoolean = (value: unknown): boolean =>
	value === true || value === 1 || value === '1';
