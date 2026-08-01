/**
 * The handful of places where the three supported engines genuinely disagree.
 *
 * Deliberately a small closed set of physical type decisions rather than a
 * general abstraction layer. RFC 0004's argument is that hiding SQL behind a
 * lowest-common-denominator API is what produced the join-less query surface
 * in `@c15t/backend`; the fix is to write real SQL and name the few concrete
 * divergences, not to build another abstraction over them.
 *
 * **Every mapping here is taken from the committed 2.0.0 fixtures**
 * (`internals/migration-fixtures/fixtures/fumadb-2.0.0/*.json`), not from what
 * the engines would allow. The baseline has to land a fresh database on the
 * same physical shape an existing 2.0.0 database already has, or adopting an
 * existing database would mean rewriting columns for no behavioural gain.
 *
 * Observed there:
 *
 * | Logical  | postgres    | sqlite    | mysql        |
 * | -------- | ----------- | --------- | ------------ |
 * | id       | `varchar`   | `TEXT`    | `varchar`    |
 * | string   | `text`      | `TEXT`    | `text`       |
 * | json     | `json`      | `TEXT`    | `json`       |
 * | bool     | `bool`      | `INTEGER` | `boolean`    |
 * | timestamp| `timestamp` | `INTEGER` | `timestamp`  |
 *
 * SQLite collapses everything into `TEXT` and `INTEGER` — notably timestamps
 * are epoch integers there, which the row decoders have to account for.
 */

import { Data, Effect } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

/** The SQL engines c15t supports. MongoDB is not among them — RFC 0004 §2. */
export type Dialect = 'postgres' | 'mysql' | 'sqlite';

/**
 * Raised when the connected client speaks a dialect c15t does not support.
 *
 * Effect's own dialect union also covers `mssql` and `clickhouse`; those are
 * the only values that can reach this error, since the three c15t supports are
 * matched exhaustively.
 */
export class UnsupportedDialectError extends Data.TaggedError(
	'UnsupportedDialectError'
)<{
	readonly supported: ReadonlyArray<Dialect>;
}> {}

/**
 * Resolves the dialect from the connected client rather than from
 * configuration, so it cannot drift from the database actually in use.
 */
export const current: Effect.Effect<
	Dialect,
	UnsupportedDialectError,
	SqlClient.SqlClient
> = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql.onDialectOrElse({
		pg: () => Effect.succeed<Dialect>('postgres'),
		mysql: () => Effect.succeed<Dialect>('mysql'),
		sqlite: () => Effect.succeed<Dialect>('sqlite'),
		orElse: () =>
			Effect.fail(
				new UnsupportedDialectError({
					supported: ['postgres', 'mysql', 'sqlite'],
				})
			),
	});
});

/** Physical types for one engine, as captured in the 2.0.0 fixtures. */
export interface PhysicalTypes {
	/** Primary key column. */
	readonly id: string;
	/** String column with no index on it. */
	readonly text: string;
	/**
	 * String column carrying an index or unique constraint.
	 *
	 * MySQL cannot index `TEXT` without a prefix length, which is exactly why
	 * fumadb cannot migrate MySQL at all (RFC 0004 §3.5):
	 *
	 * ```
	 * BLOB/TEXT column 'dedupeKey' used in key specification without a key length
	 * ```
	 *
	 * Postgres and SQLite have no such restriction and existing databases
	 * already hold plain text there, so only MySQL pays for the constraint
	 * that only MySQL has.
	 */
	readonly indexedText: string;
	readonly json: string;
	readonly bool: string;
	readonly timestamp: string;
}

const TYPES: Readonly<Record<Dialect, PhysicalTypes>> = {
	postgres: {
		id: 'varchar(255)',
		text: 'text',
		indexedText: 'text',
		// `json`, not `jsonb` — matching what 2.0.0 databases actually hold.
		// Switching would mean rewriting every JSON column on adoption.
		json: 'json',
		bool: 'boolean',
		timestamp: 'timestamp',
	},
	mysql: {
		id: 'varchar(255)',
		text: 'text',
		indexedText: 'varchar(255)',
		json: 'json',
		bool: 'boolean',
		timestamp: 'timestamp',
	},
	sqlite: {
		// SQLite reports the declared type verbatim, and 2.0.0 databases
		// declare TEXT — declaring varchar(255) here would leave a fresh
		// database introspecting differently from an adopted one.
		id: 'text',
		text: 'text',
		indexedText: 'text',
		json: 'text',
		bool: 'integer',
		// Epoch integers, not a date type. Row decoding must convert.
		timestamp: 'integer',
	},
};

export function typesFor(dialect: Dialect): PhysicalTypes {
	return TYPES[dialect];
}
