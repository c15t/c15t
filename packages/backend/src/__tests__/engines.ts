/**
 * The engines a behavioural test should run against.
 *
 * Most of this package's tests use PGlite, because it runs in-process and is
 * fast. That is a reasonable default and a poor place to stop: the three
 * supported engines disagree about identifier quoting, upsert syntax,
 * `RETURNING`, boolean representation, and what a timestamp column even is.
 * A suite that only ever sees Postgres proves Postgres works.
 *
 * It was exactly that gap that hid MySQL being unable to run *any* statement
 * this package emitted — every table name was double-quoted, which MySQL
 * rejects outright — while 180 tests passed.
 *
 * So repository behaviour is asserted against every engine available in the
 * environment:
 *
 * - **PGlite** and **SQLite** run in-process and are always included.
 * - **MySQL** needs a server, so it joins only when `C15T_TEST_MYSQL_URL` is
 *   set. CI therefore stays Docker-free (RFC 0004 §7) while a release can be
 *   checked against all three:
 *
 * ```
 * docker run --rm -d -p 3399:3306 -e MYSQL_ROOT_PASSWORD=c15t \
 *   -e MYSQL_DATABASE=c15t --name c15t-test mysql:8
 * C15T_TEST_MYSQL_URL=mysql://root:c15t@127.0.0.1:3399/c15t bun run test
 * ```
 *
 * @example
 * ```ts
 * for (const engine of ENGINES) {
 * 	describe(engine.name, () => {
 * 		it.effect('does the thing', () =>
 * 			myTest.pipe(Effect.provide(engine.layer)));
 * 	});
 * }
 * ```
 */

import { MysqlClient } from '@effect/sql-mysql2';
import { PgClient } from '@effect/sql-pg';
import { PgliteClient } from '@effect/sql-pglite';
import { SqliteClient } from '@effect/sql-sqlite-node';
import { Effect, Layer, Redacted } from 'effect';
import { SqlClient } from 'effect/unstable/sql';

import { singleTenant, layer as tenantLayer } from '../db/tenant';
import type { Tenant } from '../db/tenant';

const MYSQL_URL = process.env.C15T_TEST_MYSQL_URL;
const PG_URL = process.env.C15T_TEST_PG_URL;

export interface TestEngine {
	readonly name: 'pglite' | 'postgres' | 'sqlite' | 'mysql';
	/** A client plus a single-tenant scope, which most tests want. */
	readonly layer: Layer.Layer<SqlClient.SqlClient | Tenant>;
	/**
	 * The client alone.
	 *
	 * For the HTTP tests: `createApp` takes a runtime carrying only the SQL
	 * client, because `makeRun` provides the tenant scope itself, per request.
	 */
	readonly client: Layer.Layer<SqlClient.SqlClient>;
	/** The same client, scoped to a named tenant. */
	readonly asTenant: (
		tenantId: string | undefined
	) => Layer.Layer<SqlClient.SqlClient | Tenant>;
}

const client = {
	pglite: () => PgliteClient.layer({}),
	postgres: () => PgClient.layer({ url: Redacted.make(PG_URL ?? '') }),
	sqlite: () => SqliteClient.layer({ filename: ':memory:' }),
	// Redacted, not a plain string: the URL carries credentials, and Effect
	// keeps them out of logs and error messages by construction.
	mysql: () => MysqlClient.layer({ url: Redacted.make(MYSQL_URL ?? '') }),
} as const;

const engine = (name: TestEngine['name']): TestEngine => ({
	name,
	client: client[name]() as Layer.Layer<SqlClient.SqlClient>,
	layer: Layer.merge(client[name](), singleTenant),
	asTenant: (tenantId) => Layer.merge(client[name](), tenantLayer(tenantId)),
});

/**
 * Every engine this environment can exercise.
 *
 * PGlite and real Postgres are both here on purpose rather than one standing
 * in for the other. PGlite is Postgres compiled to WASM and is close enough
 * for almost everything — but it runs a single in-process connection, so it
 * cannot exhibit anything pool-shaped. Schema scoping is the worked example:
 * a one-off `SET search_path` passes on PGlite and scopes exactly one
 * connection of a real pool.
 */
export const ENGINES: readonly TestEngine[] = [
	engine('pglite'),
	engine('sqlite'),
	...(PG_URL ? [engine('postgres')] : []),
	...(MYSQL_URL ? [engine('mysql')] : []),
];

/**
 * The engines that are real servers rather than in-process databases.
 *
 * These keep their state between tests, so a suite that assumes an empty
 * database has to reset first. PGlite and in-memory SQLite get a fresh
 * database each time their layer is built.
 */
export const SHARED_ENGINES: ReadonlySet<TestEngine['name']> = new Set([
	'postgres',
	'mysql',
]);

/**
 * Drops every table, so a case starts from an empty database.
 *
 * PGlite and in-memory SQLite get a fresh database each time their layer is
 * built, making this a no-op there. MySQL is a real shared server and does
 * not, so without this a case would inherit the previous one's schema.
 *
 * Worth doing rather than assuming: while generating the migration fixtures,
 * reusing one MySQL database across cases changed the migration *path* and
 * produced both a spurious failure and a spurious pass.
 */
export const resetDatabase = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;

	yield* sql.onDialectOrElse({
		mysql: () =>
			Effect.gen(function* () {
				yield* sql`set foreign_key_checks = 0`;
				const tables = yield* sql<{ name: string }>`
					select table_name as name from information_schema.tables
					where table_schema = database()
				`;
				for (const table of tables) {
					yield* sql.unsafe(`drop table if exists \`${table.name}\``);
				}
				yield* sql`set foreign_key_checks = 1`;
			}),
		pg: () =>
			Effect.gen(function* () {
				// PGlite is fresh per layer build and has nothing to drop, so this
				// only does work against a real server. `cascade` because the
				// schema has foreign keys and dropping in dependency order by hand
				// would break the moment one is added.
				const tables = yield* sql<{ name: string }>`
					select table_name as name from information_schema.tables
					where table_schema = current_schema() and table_type = 'BASE TABLE'
				`;
				for (const table of tables) {
					yield* sql.unsafe(`drop table if exists "${table.name}" cascade`);
				}
			}),
		orElse: () => Effect.void,
	});
});
