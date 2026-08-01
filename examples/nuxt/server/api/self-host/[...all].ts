/**
 * Self-hosted @c15t/backend mounted as a Nitro catch-all route.
 *
 * This is what makes the manifest demo self-contained in production:
 * the Nuxt module's server routes (`/api/c15t/manifest`, `/api/c15t/init`)
 * fetch `GET ${backendURL}/manifest` from here — same origin, no external
 * consent backend on the request path.
 *
 * Storage: Postgres when `DATABASE_URL` is set (production), otherwise the
 * committed local SQLite file (`c15t.db`) so `bun run dev` works with zero
 * setup — same pattern as examples/sveltekit-demo.
 */
import { c15tInstance, policyPackPresets } from '@c15t/backend';
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';
import { toWebRequest } from 'h3';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

async function createAdapter() {
	const connectionString = process.env.DATABASE_URL;
	if (connectionString) {
		const hostname = new URL(connectionString).hostname;
		const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
		return kyselyAdapter({
			db: new Kysely({
				dialect: new PostgresDialect({
					pool: new Pool({
						connectionString,
						ssl: { rejectUnauthorized: !isLocalhost },
					}),
				}),
			}),
			provider: 'postgresql',
		});
	}
	// Dynamic import: @libsql/client loads a platform-native binding at module
	// load, which serverless bundlers don't always trace. Keeping it out of
	// the static graph means the Postgres path never touches it.
	const { LibsqlDialect } = await import('@libsql/kysely-libsql');
	return kyselyAdapter({
		db: new Kysely({
			dialect: new LibsqlDialect({ url: 'file:c15t.db' }),
		}),
		provider: 'sqlite',
	});
}

const instancePromise = createAdapter().then((adapter) =>
	c15tInstance({
		appName: 'c15t-nuxt-demo',
		basePath: '/api/self-host',
		adapter,
		trustedOrigins: ['localhost', '*.localhost', 'vercel.app'],
		tenantId: 'ins_1',
		branding: 'c15t',
		// Real policy packs so the manifest carries fingerprints + matching
		// rules and POST /subjects exercises recompute-on-write. The world
		// fallback guarantees every visitor resolves a policy decision.
		policyPacks: [
			policyPackPresets.europeOptIn(),
			policyPackPresets.californiaOptOut(),
			policyPackPresets.worldNoBanner(),
		],
		manifestCache: {
			sMaxAge: 120,
			staleWhileRevalidate: 600,
		},
	})
);

export default defineEventHandler(async (event) => {
	const instance = await instancePromise;
	return instance.handler(toWebRequest(event));
});
