/**
 * The handful of places where the three supported engines genuinely disagree.
 *
 * Deliberately a small closed set of physical type decisions rather than a
 * general abstraction layer. RFC 0004's argument is that hiding SQL behind a
 * lowest-common-denominator API is what produced the join-less query surface
 * in `@c15t/backend`; the fix is to write real SQL and name the few concrete
 * divergences, not to build another abstraction over them.
 *
 * **Every mapping here is taken from a committed fixture**, not from what the
 * engines would allow. The baseline has to land a fresh database on the same
 * physical shape an existing database already has, or adopting one would mean
 * rewriting columns for no behavioural gain.
 *
 * | Logical  | postgres    | sqlite    | mysql         |
 * | -------- | ----------- | --------- | ------------- |
 * | id       | `varchar`   | `TEXT`    | `varchar`     |
 * | string   | `text`      | `TEXT`    | `text`        |
 * | json     | `json`      | `TEXT`    | `json`        |
 * | bool     | `bool`      | `INTEGER` | `tinyint`     |
 * | timestamp| `timestamp` | `INTEGER` | `datetime(3)` |
 *
 * SQLite collapses everything into `TEXT` and `INTEGER` — notably timestamps
 * are epoch integers there, which the row decoders have to account for.
 *
 * ## Where the MySQL column comes from
 *
 * Not from the 2.0.0 fixtures, because there are none: fumadb cannot migrate
 * MySQL at all, so `fixtures/fumadb-2.0.0/mysql.unsupported.json` records a
 * failure rather than a schema (§3.5). The only real MySQL databases c15t has
 * ever produced are **legacy** ones, from the pre-fumadb migrator that did
 * work there, so the `mysql.json` files under the three `fixtures/legacy-…`
 * directories are the evidence used instead.
 *
 * Those fixtures are why `timestamp` maps to `datetime` and not to MySQL's
 * `timestamp` type. Two independent reasons agree:
 *
 * - Every legacy MySQL database already holds `datetime`, so adoption adds
 *   columns that match the ones beside them.
 * - MySQL's `timestamp` is a four-byte epoch that stops at 2038-01-19 and
 *   silently converts through the session time zone. `consent.validUntil` can
 *   legitimately fall past 2038, and shifting a legal record's `givenAt` by
 *   whatever `time_zone` a connection happened to have is not acceptable for
 *   an audit trail. `datetime` has neither behaviour.
 *
 * The `(3)` is millisecond precision. Bare `datetime` truncates to whole
 * seconds, which would make MySQL the one engine that fails to return the
 * instant it was given — Postgres keeps microseconds and SQLite stores epoch
 * milliseconds. Consent ids are derived from `givenAt`, so a truncating
 * round-trip would produce a value that no longer hashes to its own id.
 * Introspection reports `datetime` either way, so this stays fixture-clean.
 */

import { Data, Effect } from 'effect';
import { SqlClient, Statement } from 'effect/unstable/sql';

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
	 * String column that something indexes.
	 *
	 * Three overlapping cases, all of which reduce to the same requirement:
	 * a unique constraint (`dedupeKey`), an entry in `2-hot-path-indexes`
	 * (`externalId`, `tenantId`, `code`, …), or a foreign key column, which
	 * MySQL indexes implicitly whether or not we ask it to.
	 *
	 * MySQL cannot index `TEXT` without a prefix length:
	 *
	 * ```
	 * BLOB/TEXT column 'dedupeKey' used in key specification without a key length
	 * ```
	 *
	 * That single restriction is why fumadb cannot migrate MySQL at all
	 * (RFC 0004 §3.5), and the legacy migrator that *could* worked precisely
	 * because it declared these columns `varchar` — which the legacy MySQL
	 * fixtures confirm.
	 *
	 * Postgres and SQLite have no such restriction and existing databases
	 * already hold plain text there, so only MySQL pays for the constraint
	 * that only MySQL has, and the fixture parity tests for the other two are
	 * unaffected.
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
		// An alias for `tinyint(1)`, which is what legacy MySQL databases
		// introspect as.
		bool: 'boolean',
		// Not `timestamp` — see the note on the 2038 cut-off and time-zone
		// conversion at the top of this file.
		timestamp: 'datetime(3)',
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

/**
 * Quotes an identifier the way the engine expects.
 *
 * MySQL delimits with backticks; Postgres and SQLite with double quotes. A
 * `create table "subject"` that works on two engines is a syntax error on the
 * third, which is precisely how MySQL support was found to be broken.
 *
 * **Only for the two places that assemble DDL as a raw string** — the baseline
 * and the index migration, which build statements from `TABLES`/`INDEXES`
 * rather than from a template literal. Everywhere else, write
 * `` sql`select ${sql('subject.id')} from ${sql('subject')}` `` and let the
 * dialect's own compiler escape it; that path is checked by the type system
 * and this one is not.
 *
 * @example
 * ```ts
 * const quote = escaperFor('mysql');
 * quote('subject'); // `subject`
 * ```
 */
export function escaperFor(dialect: Dialect): (name: string) => string {
	return dialect === 'mysql'
		? Statement.defaultEscape('`')
		: Statement.defaultEscape('"');
}
