/**
 * A real Postgres, in-process, for tests.
 *
 * PGlite is Postgres compiled to WASM, fronted by a unix socket so the actual
 * `pg` driver and Kysely `PostgresDialect` we ship to users are the ones under
 * test. That matters more than it sounds: the mocked handler tests cannot see
 * constraint violations, and SQLite can't either (`PRAGMA foreign_keys`
 * defaults to off), so an FK bug reaches production looking fully green. This
 * harness is the only place a `REFERENCES` clause is actually enforced.
 *
 * A unix socket rather than a TCP port keeps runs hermetic — no port picking,
 * no collisions between parallel test files.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { kyselyAdapter } from '../../db/adapters/kysely';
import { migrator } from '../../db/migrator';
import { DB } from '../../db/schema';

export interface PgliteDatabase {
	/** Adapter to hand to `c15tInstance({ adapter })`. */
	adapter: ReturnType<typeof kyselyAdapter>;
	/** Raw Kysely handle, for asserting on rows the handler wrote. */
	db: Kysely<Record<string, never>>;
	destroy(): Promise<void>;
}

/**
 * Boots PGlite and applies the latest c15t schema, constraints included.
 */
export async function createPgliteDatabase(): Promise<PgliteDatabase> {
	const socketDir = mkdtempSync(join(tmpdir(), 'c15t-pglite-'));
	const pglite = await PGlite.create();
	const server = new PGLiteSocketServer({
		db: pglite,
		// `pg` resolves a unix socket as `<host>/.s.PGSQL.<port>`.
		path: join(socketDir, '.s.PGSQL.5432'),
	});
	await server.start();

	const pool = new Pool({
		host: socketDir,
		port: 5432,
		user: 'postgres',
		database: 'postgres',
		// PGlite runs one WASM Postgres on a single thread; a pool that opens a
		// second connection mid-transaction gets `write EPIPE` from the socket
		// server. One connection also makes test ordering deterministic.
		max: 1,
	});
	const db = new Kysely<Record<string, never>>({
		dialect: new PostgresDialect({ pool }),
	});
	const adapter = kyselyAdapter({ db, provider: 'postgresql' });

	const result = await migrator({ db: DB.client(adapter), schema: 'latest' });
	if ('path' in result) {
		throw new Error('Expected an executable migration for the Kysely adapter.');
	}
	await result.execute();

	return {
		adapter,
		db,
		async destroy() {
			await db.destroy();
			await server.stop();
			await pglite.close();
			rmSync(socketDir, { recursive: true, force: true });
		},
	};
}
