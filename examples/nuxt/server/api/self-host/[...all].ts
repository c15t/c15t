/**
 * Self-hosted @c15t/backend mounted as a Nitro catch-all route.
 *
 * This is what makes the manifest demo self-contained in production:
 * the Nuxt module's server routes (`/api/c15t/manifest`, `/api/c15t/init`)
 * fetch `GET ${backendURL}/manifest` from here — same origin, no external
 * consent backend on the request path.
 *
 * Storage selection lives in `lib/adapter.ts`, shared with the CLI config and
 * the migration script so the three cannot drift.
 */
import { c15tInstance, createMigrator } from '@c15t/backend';
import { policyRulePresets } from 'c15t';
import { toWebRequest } from 'h3';

import { createAdapter } from '../../../lib/adapter';
import type { ResolvedAdapter } from '../../../lib/adapter';

/**
 * Origins allowed to call this backend cross-origin.
 *
 * The demo is same-origin, so this only matters if you point another site at
 * it. `isOriginTrusted` compares hostnames exactly unless the entry starts with
 * `*.`, so the deployment's own host has to be named: a bare `vercel.app` entry
 * matches nothing, and `*.vercel.app` would trust every deployment on Vercel.
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
 * Embedded-only. Migrating on boot against a shared Postgres would race across
 * instances — for deploys run `bun run db:migrate`, which reads the same
 * adapter from `c15t-backend.config.ts`.
 */
const ensureLocalSchema = async function ensureLocalSchema({
	database,
	mode,
}: ResolvedAdapter) {
	if (mode !== 'embedded') {
		return;
	}
	// One call: it classifies the database, adopts it to the baseline if it is
	// behind, and applies whatever migrations the ledger has not recorded.
	// There is no ORM branch to handle any more — every supported engine
	// migrates.
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
			appName: 'c15t-nuxt-demo',
			branding: 'c15t',
			// Real policy packs so the manifest carries fingerprints + matching
			// rules and POST /subjects exercises recompute-on-write. The world
			// fallback guarantees every visitor resolves a policy decision.
			policyRules: [
				policyRulePresets.europeOptIn(),
				policyRulePresets.californiaOptOut(),
				policyRulePresets.worldOptOutNoPrompt(),
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

export default defineEventHandler(async (event) => {
	const instance = await getInstance();
	return instance.handler(toWebRequest(event));
});
