/**
 * Single source of truth for the demo's database adapter.
 *
 * Shared by the Nitro route (`server/api/self-host/[...all].ts`), the CLI
 * config (`c15t-backend.config.ts`) and migrations, so the three can never
 * drift apart.
 *
 * Both modes speak Postgres through the same `pg` driver and Kysely
 * `PostgresDialect` — only the destination differs:
 *
 * - `DATABASE_URL` set → that Postgres (production/Vercel).
 * - otherwise → PGlite, Postgres compiled to WASM, running in-process behind
 *   a unix socket.
 *
 * The point of PGlite over a file-backed SQLite is that constraints are real.
 * SQLite ships with `PRAGMA foreign_keys` off, so a consent row pointing at a
 * non-existent policy inserts happily and only blows up once the demo is
 * deployed against Postgres — which is exactly the bug this example was built
 * to exercise.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

/**
 * Where PGlite keeps its data directory and socket.
 *
 * Resolved from `process.cwd()` rather than `import.meta.url`: every
 * documented command runs from `examples/nuxt`, and `import.meta.url` would
 * point into `.nuxt/`/`.output/` once Nitro bundles the server. Gitignored —
 * delete it to reset the demo.
 */
export const LOCAL_DATA_DIR = resolve(process.cwd(), '.pgdata');

function adapterFor(pool: Pool) {
	return kyselyAdapter({
		db: new Kysely({ dialect: new PostgresDialect({ pool }) }),
		provider: 'postgresql',
	});
}

function createPostgresAdapter(connectionString: string) {
	const { hostname } = new URL(connectionString);
	const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
	return adapterFor(
		new Pool({
			connectionString,
			ssl: { rejectUnauthorized: !isLocalhost },
		})
	);
}

/**
 * Specifiers are held in variables so Nitro's dependency tracer cannot follow
 * them. A literal `import('@electric-sql/pglite')` — even guarded behind a
 * runtime check — copies ~16 MB of WASM (`pglite.wasm`, `pglite.data`) into
 * `.output`, where `DATABASE_URL` is mandatory and PGlite is never
 * constructed. These are real dependencies, so Node resolves them fine at
 * runtime under `nuxt dev`.
 */
const EMBEDDED_POSTGRES_MODULES = [
	'@electric-sql/pglite',
	'@electric-sql/pglite-socket',
] as const;

async function createEmbeddedPostgresAdapter() {
	const [{ PGlite }, { PGLiteSocketServer }] = await Promise.all([
		import(/* @vite-ignore */ EMBEDDED_POSTGRES_MODULES[0]) as Promise<
			typeof import('@electric-sql/pglite')
		>,
		import(/* @vite-ignore */ EMBEDDED_POSTGRES_MODULES[1]) as Promise<
			typeof import('@electric-sql/pglite-socket')
		>,
	]);

	mkdirSync(LOCAL_DATA_DIR, { recursive: true });
	const pglite = await PGlite.create({
		dataDir: resolve(LOCAL_DATA_DIR, 'db'),
	});
	// `pg` resolves a unix socket as `<host>/.s.PGSQL.<port>`, so the socket
	// has to be named that and the pool points at the directory.
	const server = new PGLiteSocketServer({
		db: pglite,
		path: resolve(LOCAL_DATA_DIR, '.s.PGSQL.5432'),
	});
	await server.start();

	return adapterFor(
		new Pool({
			host: LOCAL_DATA_DIR,
			port: 5432,
			user: 'postgres',
			database: 'postgres',
			// PGlite is one WASM Postgres on a single thread; a second
			// connection opened mid-transaction gets `write EPIPE`.
			max: 1,
		})
	);
}

export type ResolvedAdapter = {
	adapter: ReturnType<typeof adapterFor>;
	/** `embedded` runs migrations on boot; a real Postgres must not. */
	mode: 'postgres' | 'embedded';
};

export async function createAdapter(): Promise<ResolvedAdapter> {
	const connectionString = process.env.DATABASE_URL;
	if (connectionString) {
		return {
			adapter: createPostgresAdapter(connectionString),
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

	return { adapter: await createEmbeddedPostgresAdapter(), mode: 'embedded' };
}
