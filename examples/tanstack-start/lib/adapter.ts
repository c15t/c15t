/**
 * Single source of truth for the demo's database adapter.
 *
 * Shared by the server route (`src/routes/api/self-host/$.ts`) and the CLI
 * config (`c15t-backend.config.ts`), so the two can never drift apart.
 *
 * Both modes are Postgres, only the destination differs:
 *
 * - `DATABASE_URL` set → that Postgres (production/Vercel), via `pg`.
 * - otherwise → PGlite, Postgres compiled to WASM, running in-process.
 *
 * PGlite rather than a file-backed SQLite because constraints are real.
 * SQLite ships with `PRAGMA foreign_keys` off, so a consent row pointing at
 * a non-existent policy inserts happily and only blows up once deployed.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import type { DatabaseOption } from '@c15t/backend';
import type * as EffectSqlPgliteTypes from '@effect/sql-pglite';

/**
 * Where PGlite keeps its data directory.
 *
 * Resolved from `process.cwd()` rather than `import.meta.url`: every
 * documented command runs from `examples/tanstack-start`, and
 * `import.meta.url` would point into `dist/` once Vite bundles the server.
 * Gitignored; delete it to reset the demo.
 */
export const LOCAL_DATA_DIR = resolve(process.cwd(), '.pgdata');

/**
 * Specifier held in a variable (and marked `@vite-ignore`) so the bundler
 * cannot follow it. A literal `import('@effect/sql-pglite')` would pull
 * ~16 MB of WASM into the server build, where `DATABASE_URL` is mandatory
 * and PGlite is never constructed. It is a real dependency, so Node
 * resolves it fine at runtime under `vite dev`.
 */
const EMBEDDED_POSTGRES_MODULE = '@effect/sql-pglite';

export interface ResolvedAdapter {
	database: DatabaseOption;
	/** `embedded` runs migrations on boot; a real Postgres must not. */
	mode: 'postgres' | 'embedded';
}

/**
 * The embedded case is why `database` accepts a layer as well as a config.
 *
 * `{ dialect: 'postgres', url }` covers a real server, but PGlite is
 * Postgres compiled to WASM with no URL to point at. Handing c15t the
 * client directly is the escape hatch working as intended.
 */
const createEmbeddedDatabase =
	async function createEmbeddedDatabase(): Promise<DatabaseOption> {
		const embeddedModule = EMBEDDED_POSTGRES_MODULE;
		const { PgliteClient } = (await import(
			/* @vite-ignore */
			embeddedModule
		)) as typeof EffectSqlPgliteTypes;

		// PGlite mkdirs the data directory itself but not its parent.
		mkdirSync(LOCAL_DATA_DIR, { recursive: true });
		return PgliteClient.layer({ dataDir: resolve(LOCAL_DATA_DIR, 'db') });
	};

export const createAdapter =
	async function createAdapter(): Promise<ResolvedAdapter> {
		const connectionString = process.env.DATABASE_URL;
		if (connectionString) {
			return {
				database: { dialect: 'postgres', url: connectionString },
				mode: 'postgres',
			};
		}

		// PGlite only works under `vite dev`: the production server bundle does
		// not carry its WASM assets, and a serverless filesystem is read-only
		// anyway. Fail with something actionable instead.
		if (process.env.NODE_ENV === 'production') {
			throw new Error(
				'DATABASE_URL is required for a production build of this example. The ' +
					'embedded PGlite database is `vite dev` only. Provision a Postgres ' +
					'database, set DATABASE_URL, and run `bun run db:migrate`.'
			);
		}

		return { database: await createEmbeddedDatabase(), mode: 'embedded' };
	};
