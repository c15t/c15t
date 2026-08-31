/**
 * Turning configuration into a database connection.
 *
 * `@c15t/backend` 2.x took a fumadb adapter — `adapter: kyselyAdapter({ db,
 * provider })` — so booting the backend meant installing Kysely, constructing
 * a dialect, and handing it over. That signature cannot survive the rewrite:
 * storage here is an Effect `SqlClient`, not an ORM adapter.
 *
 * Two ways in, because there are two audiences:
 *
 * - **A config object.** `{ dialect: 'postgres', url }`. The common case, and
 *   it must not require knowing that Effect exists. A self-hoster running the
 *   backend should not have to learn `Layer`, `Redacted` and
 *   `@effect/sql-pg` to point it at a database.
 * - **A `Layer` directly.** For anyone embedding this in an Effect
 *   application, sharing a pool, or pointing tests at PGlite. The config path
 *   just builds one of these, so nothing is reachable only through it.
 *
 * ## Why the drivers are imported dynamically
 *
 * `@effect/sql-pg`, `@effect/sql-mysql2` and `@effect/sql-sqlite-node` are
 * optional peers: a deployment installs the one driver it needs. A static
 * import of all three would make every install pull all three, and a
 * Postgres-only deployment would fail to resolve `mysql2`. So the driver is
 * imported when its dialect is chosen, and only then.
 *
 * `Layer.unwrap` is what makes that composable — the import is an `Effect`
 * producing a `Layer`, flattened into a `Layer` the runtime can build.
 */

// oxlint-disable-next-line max-classes-per-file -- Preserve declaration order, interface shape, and public compatibility.
import { Effect, Layer, Redacted } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';

/** A database this backend can connect to, described rather than constructed. */
export type DatabaseConfig =
	| {
			readonly dialect: 'postgres';
			/** e.g. `postgres://user:pass@host:5432/db` */
			readonly url: string;
			/**
			 * A Postgres schema to keep c15t's tables in.
			 *
			 * For sharing a database with another application: c15t's tables
			 * land in this schema rather than `public`, which gives real
			 * isolation — separate grants, `pg_dump -n c15t`, and
			 * `DROP SCHEMA c15t CASCADE` to uninstall — rather than just a
			 * naming convention.
			 *
			 * Created if it does not exist when you migrate.
			 *
			 * **Postgres only, and deliberately.** MySQL has no schemas: a
			 * database *is* the unit of isolation, so point `url` at a
			 * different one. SQLite's unit is the file, so use a different
			 * `filename`. Both already scope c15t without a new option, and
			 * offering one that meant three different things would be worse
			 * than not offering it.
			 */
			readonly schema?: string;
	  }
	| {
			readonly dialect: 'mysql';
			/** e.g. `mysql://user:pass@host:3306/db` */
			readonly url: string;
	  }
	| {
			readonly dialect: 'sqlite';
			/** A path, or `':memory:'`. */
			readonly filename: string;
	  };

/**
 * Either a description of a database or a client layer for one.
 *
 * The layer's error and requirement types are deliberately loose: a caller
 * supplying their own client may have whatever error channel their driver
 * has, and constraining it here would reject valid layers for no benefit.
 */
export type DatabaseOption =
	| DatabaseConfig
	// error type; narrowing it would reject valid clients.
	| Layer.Layer<SqlClient.SqlClient, unknown, never>;

const isConfig = (database: DatabaseOption): database is DatabaseConfig =>
	'dialect' in database;

/**
 * Raised when `database` is absent.
 *
 * Guarded explicitly because the alternative is a bare
 * `Cannot use 'in' operator to search for 'dialect' in undefined` from the
 * check above, which says nothing about what the caller got wrong. This is the
 * first thing anyone upgrading from 2.x hits, since `adapter` no longer exists
 * and its replacement is required.
 */
export class MissingDatabaseError extends Error {
	constructor() {
		super(
			'c15t needs a `database`. Pass a connection — ' +
				"`{ dialect: 'postgres', url: process.env.DATABASE_URL }` — or a " +
				"SqlClient layer. c15t 3.0 replaced 2.x's `adapter` field; see the " +
				'upgrade guide.'
		);
		this.name = 'MissingDatabaseError';
	}
}

/**
 * Raised when the driver for a configured dialect is not installed.
 *
 * A missing optional peer is a setup mistake with an obvious fix, so it says
 * what to install rather than surfacing a bare module-resolution failure.
 */
export class DriverNotInstalledError extends Error {
	constructor(dialect: DatabaseConfig['dialect'], packageName: string) {
		super(
			`c15t is configured for ${dialect}, but ${packageName} is not installed. ` +
				'Install it with your package manager — drivers are optional peer ' +
				'dependencies so a deployment only pulls the one it uses.'
		);
		this.name = 'DriverNotInstalledError';
	}
}

const driver = {
	mysql: '@effect/sql-mysql2',
	postgres: '@effect/sql-pg',
	sqlite: '@effect/sql-sqlite-node',
} as const;

/**
 * Imports a driver, turning "not installed" into an actionable message.
 *
 * Exported for its test: the failure only happens when an optional peer is
 * absent, and all three are present in this repo, so the only way to exercise
 * it is to hand it an importer that fails. Not part of the public API.
 *
 * @internal
 */
export const loadDriver = <A>(
	dialect: DatabaseConfig['dialect'],
	importer: () => Promise<A>
): Effect.Effect<A> =>
	Effect.tryPromise({
		catch: () => new DriverNotInstalledError(dialect, driver[dialect]),
		try: importer,
	}).pipe(
		// A missing driver is a configuration error the operator must fix, not a
		// condition the backend can recover from, so it is a defect rather than
		// a typed failure every caller would have to thread through.
		Effect.orDie
	);

/**
 * Puts a schema on the connection's `search_path`.
 *
 * Done on the connection rather than by qualifying every table name, because
 * a pool hands out many connections and a one-off `SET search_path` would
 * scope exactly one of them. Verified against a real pool: `current_schema()`
 * reports the configured schema on every checkout, and an unqualified
 * `create table` lands there rather than in `public`.
 *
 * The upshot is that no query in this package has to know about schemas —
 * every unqualified name resolves into it — and the introspection queries ask
 * `current_schema()` rather than assuming `public`.
 */
export const withSearchPath = function withSearchPath(
	url: string,
	schema: string | undefined
): string {
	if (schema === undefined || schema.trim() === '') {
		return url;
	}

	// Rejected rather than escaped: this ends up in a startup parameter, not a
	// bound value, and a schema name is a short identifier in every legitimate
	// use. Anything else is a mistake worth surfacing loudly.
	if (!/^[A-Za-z_][A-Za-z0-9_$]*$/u.test(schema)) {
		throw new Error(
			`Invalid Postgres schema name "${schema}". Expected an unquoted ` +
				'identifier: a letter or underscore followed by letters, digits, ' +
				'underscores or dollar signs.'
		);
	}

	const parsed = new URL(url);
	// Appended to any existing `options`, not substituted for them. A connection
	// string carrying `?options=-c timezone=UTC` would otherwise lose that
	// silently — the same class of bug as dropping `sslmode`, which this
	// function already takes care to preserve.
	const existing = parsed.searchParams.get('options');
	parsed.searchParams.set(
		'options',
		existing
			? `${existing} -c search_path=${schema}`
			: `-c search_path=${schema}`
	);
	return parsed.toString();
};

const fromConfig = (
	config: DatabaseConfig
	// The three drivers do not agree on an error channel — MySQL's adds
	// `ConfigError` — and unifying them here would buy nothing: a caller can do
	// nothing useful with the distinction between "bad config" and "cannot
	// connect" at layer-construction time.
): Layer.Layer<SqlClient.SqlClient, unknown> => {
	switch (config.dialect) {
		case 'postgres':
			return Layer.unwrap(
				Effect.map(
					loadDriver('postgres', () => import('@effect/sql-pg')),
					// Redacted because the URL carries credentials, and Effect keeps
					// them out of logs and error messages by construction.
					({ PgClient }) =>
						PgClient.layer({
							url: Redacted.make(withSearchPath(config.url, config.schema)),
						})
				)
			);
		case 'mysql':
			return Layer.unwrap(
				Effect.map(
					loadDriver('mysql', () => import('@effect/sql-mysql2')),
					({ MysqlClient }) =>
						MysqlClient.layer({ url: Redacted.make(config.url) })
				)
			);
		case 'sqlite':
			return Layer.unwrap(
				Effect.map(
					loadDriver('sqlite', () => import('@effect/sql-sqlite-node')),
					({ SqliteClient }) =>
						SqliteClient.layer({ filename: config.filename })
				)
			);
	}
};

/**
 * The client layer for whichever form of configuration was given.
 *
 * @example
 * ```ts
 * toLayer({ dialect: 'postgres', url: process.env.DATABASE_URL });
 * toLayer(PgClient.layer({ url: Redacted.make(url) }));
 * ```
 */
export const toLayer = (
	database: DatabaseOption
): Layer.Layer<SqlClient.SqlClient, unknown> => {
	if (database === undefined || database === null) {
		throw new MissingDatabaseError();
	}
	return isConfig(database) ? fromConfig(database) : database;
};
