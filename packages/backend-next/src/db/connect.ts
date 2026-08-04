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

import { Effect, Layer, Redacted } from 'effect';
import type { SqlClient } from 'effect/unstable/sql';

/** A database this backend can connect to, described rather than constructed. */
export type DatabaseConfig =
	| {
			readonly dialect: 'postgres';
			/** e.g. `postgres://user:pass@host:5432/db` */
			readonly url: string;
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
	// biome-ignore lint/suspicious/noExplicitAny: a caller's layer may carry any
	// error type; narrowing it would reject valid clients.
	| Layer.Layer<SqlClient.SqlClient, any, never>;

const isConfig = (database: DatabaseOption): database is DatabaseConfig =>
	'dialect' in database;

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
	postgres: '@effect/sql-pg',
	mysql: '@effect/sql-mysql2',
	sqlite: '@effect/sql-sqlite-node',
} as const;

const load = <A>(
	dialect: DatabaseConfig['dialect'],
	importer: () => Promise<A>
): Effect.Effect<A> =>
	Effect.tryPromise({
		try: importer,
		catch: () => new DriverNotInstalledError(dialect, driver[dialect]),
	}).pipe(
		// A missing driver is a configuration error the operator must fix, not a
		// condition the backend can recover from, so it is a defect rather than
		// a typed failure every caller would have to thread through.
		Effect.orDie
	);

const fromConfig = (
	config: DatabaseConfig
	// The three drivers do not agree on an error channel — MySQL's adds
	// `ConfigError` — and unifying them here would buy nothing: a caller can do
	// nothing useful with the distinction between "bad config" and "cannot
	// connect" at layer-construction time.
	// biome-ignore lint/suspicious/noExplicitAny: see above.
): Layer.Layer<SqlClient.SqlClient, any> => {
	switch (config.dialect) {
		case 'postgres':
			return Layer.unwrap(
				Effect.map(
					load('postgres', () => import('@effect/sql-pg')),
					// Redacted because the URL carries credentials, and Effect keeps
					// them out of logs and error messages by construction.
					({ PgClient }) => PgClient.layer({ url: Redacted.make(config.url) })
				)
			);
		case 'mysql':
			return Layer.unwrap(
				Effect.map(
					load('mysql', () => import('@effect/sql-mysql2')),
					({ MysqlClient }) =>
						MysqlClient.layer({ url: Redacted.make(config.url) })
				)
			);
		case 'sqlite':
			return Layer.unwrap(
				Effect.map(
					load('sqlite', () => import('@effect/sql-sqlite-node')),
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
	// biome-ignore lint/suspicious/noExplicitAny: mirrors `DatabaseOption`.
): Layer.Layer<SqlClient.SqlClient, any> =>
	isConfig(database) ? fromConfig(database) : database;
