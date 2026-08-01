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
import { PgliteClient } from '@effect/sql-pglite';
import { SqliteClient } from '@effect/sql-sqlite-node';
import { Effect, Layer, Redacted } from 'effect';
import { SqlClient } from 'effect/unstable/sql';
import { singleTenant, type Tenant, layer as tenantLayer } from '../db/tenant';

const MYSQL_URL = process.env.C15T_TEST_MYSQL_URL;

export interface TestEngine {
	readonly name: 'pglite' | 'sqlite' | 'mysql';
	/** A client plus a single-tenant scope, which most tests want. */
	readonly layer: Layer.Layer<SqlClient.SqlClient | Tenant>;
	/** The same client, scoped to a named tenant. */
	readonly asTenant: (
		tenantId: string | undefined
	) => Layer.Layer<SqlClient.SqlClient | Tenant>;
}

const client = {
	pglite: () => PgliteClient.layer({}),
	sqlite: () => SqliteClient.layer({ filename: ':memory:' }),
	// Redacted, not a plain string: the URL carries credentials, and Effect
	// keeps them out of logs and error messages by construction.
	mysql: () => MysqlClient.layer({ url: Redacted.make(MYSQL_URL ?? '') }),
} as const;

const engine = (name: TestEngine['name']): TestEngine => ({
	name,
	layer: Layer.merge(client[name](), singleTenant),
	asTenant: (tenantId) => Layer.merge(client[name](), tenantLayer(tenantId)),
});

/** Every engine this environment can exercise. */
export const ENGINES: readonly TestEngine[] = [
	engine('pglite'),
	engine('sqlite'),
	...(MYSQL_URL ? [engine('mysql')] : []),
];

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
		orElse: () => Effect.void,
	});
});
