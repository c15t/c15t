/**
 * Self-hosted @c15t/backend mounted as a TanStack Start server route.
 *
 * This is what makes the demo self-contained: the consent routes
 * (`/api/c15t/manifest`, `/api/c15t/init`) fetch `GET
 * ${backendURL}/manifest` from here, same origin, so no external consent
 * backend sits on the request path, and the browser's `POST /subjects`
 * lands here too.
 *
 * Storage selection lives in `lib/adapter.ts`, shared with the CLI config so
 * the two cannot drift.
 */
import { c15tInstance, createMigrator, policyPackPresets } from '@c15t/backend';
import { createFileRoute } from '@tanstack/react-router';

import { createAdapter } from '../../../../lib/adapter';
import type { ResolvedAdapter } from '../../../../lib/adapter';

/**
 * Origins allowed to call this backend cross-origin.
 *
 * The demo is same-origin, so this only matters if you point another site at
 * it. `isOriginTrusted` compares hostnames exactly unless the entry starts
 * with `*.`, so a deployment's own host has to be named.
 */
const trustedOrigins = function trustedOrigins(): string[] {
	const origins = ['localhost', '*.localhost'];
	for (const host of [
		process.env.VERCEL_PROJECT_PRODUCTION_URL,
		process.env.VERCEL_BRANCH_URL,
		process.env.VERCEL_URL,
	]) {
		if (host && !origins.includes(host)) {
			origins.push(host);
		}
	}
	return origins;
};

/**
 * Create the embedded PGlite schema on first boot so `bun run dev` needs zero
 * setup and the data directory can stay out of git.
 *
 * Embedded-only. Migrating on boot against a shared Postgres would race
 * across instances; for deploys run `bun run db:migrate`, which reads the
 * same adapter from `c15t-backend.config.ts`.
 */
const ensureLocalSchema = async function ensureLocalSchema({
	database,
	mode,
}: ResolvedAdapter) {
	if (mode !== 'embedded') {
		return;
	}
	const migrator = createMigrator(database);
	try {
		await migrator.apply();
	} finally {
		await migrator.dispose();
	}
};

const createInstance = async function createInstance() {
	const resolved = await createAdapter();
	await ensureLocalSchema(resolved);

	return c15tInstance({
		basePath: '/api/self-host',
		database: resolved.database,
		manifest: {
			appName: 'c15t-tanstack-start-demo',
			branding: 'c15t',
			// Enabled so the manifest carries a GVL reference; the init route
			// resolves the vendor list for IAB visitors and skips it for others.
			// The CMP id travels in the manifest too, so the client needs no
			// IAB configuration of its own. Register your own id with the IAB
			// before going live; 10 is a placeholder for the demo.
			iab: { cmpId: 10, enabled: true },
			// Real policy packs so the manifest carries fingerprints + matching
			// rules and POST /subjects exercises recompute-on-write. Europe runs
			// the IAB TCF model; the world fallback guarantees every visitor
			// resolves a policy decision.
			policyPacks: [
				policyPackPresets.europeIab(),
				policyPackPresets.californiaOptOut(),
				policyPackPresets.worldNoBanner(),
			],
			tenantId: 'ins_1',
		},
		manifestCache: {
			sMaxAge: 120,
			staleWhileRevalidate: 600,
		},
		tenantId: 'ins_1',
		trustedOrigins: trustedOrigins(),
	});
};

let instancePromise: ReturnType<typeof createInstance> | undefined;

const getInstance = function getInstance() {
	if (!instancePromise) {
		instancePromise = (async () => {
			try {
				return await createInstance();
			} catch (error) {
				// Drop the memo so a transient failure (database asleep, credentials
				// since corrected) doesn't poison every later request for the
				// lifetime of the process.
				instancePromise = undefined;
				throw error;
			}
		})();
	}
	return instancePromise;
};

const handle = async function handle({ request }: { request: Request }) {
	const instance = await getInstance();
	return instance.handler(request);
};

export const Route = createFileRoute('/api/self-host/$')({
	server: {
		handlers: {
			DELETE: handle,
			GET: handle,
			OPTIONS: handle,
			PATCH: handle,
			POST: handle,
			PUT: handle,
		},
	},
});
