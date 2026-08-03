/**
 * Single source of truth for the demo's database adapter.
 *
 * Shared by the Nitro route (`server/api/self-host/[...all].ts`) and the CLI
 * config (`c15t-backend.config.ts`), so the two can never drift apart.
 *
 * Both modes are Postgres — only the destination differs:
 *
 * - `DATABASE_URL` set → that Postgres (production/Vercel), via `pg`.
 * - otherwise → PGlite, Postgres compiled to WASM, running in-process.
 *
 * PGlite rather than a file-backed SQLite because constraints are real. SQLite
 * ships with `PRAGMA foreign_keys` off, so a consent row pointing at a
 * non-existent policy inserts happily and only blows up once the demo is
 * deployed — which is exactly the bug this example was built to exercise.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatabaseOption } from '@c15t/backend-next';

/**
 * Where PGlite keeps its data directory.
 *
 * Resolved from `process.cwd()` rather than `import.meta.url`: every
 * documented command runs from `examples/nuxt`, and `import.meta.url` would
 * point into `.nuxt/`/`.output/` once Nitro bundles the server. Gitignored —
 * delete it to reset the demo.
 */
export const LOCAL_DATA_DIR = resolve(process.cwd(), '.pgdata');

/**
 * Specifier held in a variable so Nitro's dependency tracer cannot follow it.
 * A literal `import('@effect/sql-pglite')` — even guarded behind a runtime
 * check — copies ~16 MB of WASM (`pglite.wasm`, `pglite.data`) into `.output`,
 * where `DATABASE_URL` is mandatory and PGlite is never constructed. It is a
 * real dependency, so Node resolves it fine at runtime under `nuxt dev`.
 */
const EMBEDDED_POSTGRES_MODULE = '@effect/sql-pglite';

export type ResolvedAdapter = {
	database: DatabaseOption;
	/** `embedded` runs migrations on boot; a real Postgres must not. */
	mode: 'postgres' | 'embedded';
};

/**
 * The embedded case is why `database` accepts a layer as well as a config.
 *
 * `{ dialect: 'postgres', url }` covers a real server, but PGlite is Postgres
 * compiled to WASM with no URL to point at — it is constructed, not dialled.
 * Handing c15t the client directly is the escape hatch working as intended.
 */
async function createEmbeddedDatabase(): Promise<DatabaseOption> {
	const { PgliteClient } = (await import(
		/* @vite-ignore */ EMBEDDED_POSTGRES_MODULE
	)) as typeof import('@effect/sql-pglite');

	// PGlite mkdirs the data directory itself but not its parent.
	mkdirSync(LOCAL_DATA_DIR, { recursive: true });
	return PgliteClient.layer({ dataDir: resolve(LOCAL_DATA_DIR, 'db') });
}

export async function createAdapter(): Promise<ResolvedAdapter> {
	const connectionString = process.env.DATABASE_URL;
	if (connectionString) {
		// SSL negotiation and pooling move behind the driver, so the demo no
		// longer has to construct either.
		return {
			database: { dialect: 'postgres', url: connectionString },
			mode: 'postgres',
		};
	}

	// PGlite only works under `nuxt dev`: a production Nitro bundle doesn't
	// trace its WASM assets, and a serverless filesystem is read-only anyway.
	// Fail with something actionable instead.
	if (process.env.NODE_ENV === 'production') {
		throw new Error(
			'DATABASE_URL is required for a production build of this example. The ' +
				'embedded PGlite database is `nuxt dev` only — provision a Postgres ' +
				'database, set DATABASE_URL, and run `bun run db:migrate`.'
		);
	}

	return { database: await createEmbeddedDatabase(), mode: 'embedded' };
}
