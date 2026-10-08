/**
 * Gives every Vitest worker its own database on the real servers.
 *
 * Tests against MySQL and Postgres reset and migrate whichever database they
 * connect to. With one shared database, two files doing that at once fail
 * depending on scheduling, so the suite used to run its files one at a time
 * whenever either server was configured. In CI that made the backend suite
 * the slowest job in a release.
 *
 * Pointing each worker at a database of its own removes the sharing instead:
 * this setup file rewrites `C15T_TEST_PG_URL` and `C15T_TEST_MYSQL_URL` to a
 * per-worker database before any test module reads them, creating that
 * database on first use. `VITEST_POOL_ID` is stable for a worker, so later
 * files in the same worker reuse it.
 */

import { MysqlClient } from '@effect/sql-mysql2';
import { PgClient } from '@effect/sql-pg';
import { Effect, Redacted } from 'effect';
import { SqlClient } from 'effect/sql';

const worker = process.env.VITEST_POOL_ID ?? '1';

/** The URL's database name, suffixed for this worker. */
const workerDatabase = function workerDatabase(sharedUrl: string) {
	const url = new URL(sharedUrl);
	const shared = decodeURIComponent(url.pathname.slice(1));
	if (!shared) {
		throw new Error('Name a database in the test database URL');
	}
	const name = `${shared}_w${worker}`;
	// Interpolated into quoted DDL below, which cannot take a bound parameter,
	// so reject only what could escape the quoting.
	if (!/^[\w.-]+$/u.test(name)) {
		throw new Error(`Cannot derive a worker database from "${name}"`);
	}
	// Postgres silently truncates longer identifiers, which would create one
	// database and connect to another; MySQL allows 64.
	if (name.length > 63) {
		throw new Error(`Worker database name "${name}" exceeds 63 characters`);
	}
	url.pathname = `/${name}`;
	return { name, url: url.toString() };
};

/**
 * Remembers the configured URL the first time, so a worker that runs several
 * files never suffixes an already-suffixed URL.
 */
const sharedUrl = function sharedUrl(variable: string) {
	const shared = `${variable}_SHARED`;
	const configured = process.env[shared] ?? process.env[variable];
	// Assigning `undefined` to `process.env` stores the string "undefined".
	if (configured) {
		process.env[shared] = configured;
	}
	return configured;
};

const pgShared = sharedUrl('C15T_TEST_PG_URL');
if (pgShared) {
	const { name, url } = workerDatabase(pgShared);
	await Effect.runPromise(
		Effect.gen(function* createPgDatabase() {
			const sql = yield* SqlClient.SqlClient;
			// Postgres has no `create database if not exists`.
			const existing = yield* sql`
				select 1 from pg_database where datname = ${name}
			`;
			if (existing.length === 0) {
				yield* sql.unsafe(`create database "${name}"`);
			}
		}).pipe(Effect.provide(PgClient.layer({ url: Redacted.make(pgShared) })))
	);
	process.env.C15T_TEST_PG_URL = url;
}

const mysqlShared = sharedUrl('C15T_TEST_MYSQL_URL');
if (mysqlShared) {
	const { name, url } = workerDatabase(mysqlShared);
	await Effect.runPromise(
		Effect.gen(function* createMysqlDatabase() {
			const sql = yield* SqlClient.SqlClient;
			yield* sql.unsafe(`create database if not exists \`${name}\``);
		}).pipe(
			Effect.provide(MysqlClient.layer({ url: Redacted.make(mysqlShared) }))
		)
	);
	process.env.C15T_TEST_MYSQL_URL = url;
}
