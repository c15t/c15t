import 'server-only';

import { c15tInstance } from '@c15t/backend';
import { createUpstashRedisAdapter } from '@c15t/backend/cache';
import { DEMO_LEGAL_DOCUMENT_SNAPSHOT } from './demo-legal-document-snapshot';
import {
	DEFAULT_SCENARIO_ID,
	DEMO_CMP_ID,
	DEMO_CUSTOM_VENDORS,
	DEMO_IAB_VENDOR_IDS,
	DEMO_POLICY_SNAPSHOT_KEY,
	demoI18nMessages,
	getScenarioPolicyPacks,
} from './scenarios';

/**
 * c15t opens its own connection now, so there is no Kysely instance to build
 * and hand over. SSL negotiation, pooling and dialect selection all move
 * behind the driver — which is why this file lost forty lines.
 */
export const postgresDb = {
	dialect: 'postgres',
	url: process.env.DATABASE_URL ?? '',
} as const;

export const tursoDb = {
	dialect: 'sqlite',
	filename: process.env.DATABASE_PATH ?? './c15t-demo.db',
} as const;

export const DEMO_TERMS_RELEASE = {
	title: 'c15t Example Terms & Conditions',
	type: 'terms_and_conditions' as const,
	version: '2026-04-13',
	hash: 'c15t-example-terms-v2026-04-13',
	effectiveDate: '2026-04-13T00:00:00.000Z',
};

export function createDemoInstance(scenario = DEFAULT_SCENARIO_ID) {
	const gvlCache =
		process.env.REDIS_URL && process.env.REDIS_TOKEN
			? createUpstashRedisAdapter({
					url: process.env.REDIS_URL,
					token: process.env.REDIS_TOKEN,
				})
			: undefined;

	return c15tInstance({
		database: postgresDb,
		basePath: '/api/self-host',
		trustedOrigins: ['localhost', '*.localhost', 'vercel.app'],
		tenantId: 'ins_1',
		// Everything a client needs to render the banner now lives in one
		// manifest, built by @c15t/schema so the server and the browser resolve
		// it identically.
		manifest: {
			tenantId: 'ins_1',
			appName: 'c15t-self-host',
			branding: 'c15t',
			i18n: {
				defaultProfile: 'default',
				messages: demoI18nMessages,
			},
			policyPacks: getScenarioPolicyPacks(scenario),
			iab: {
				enabled: true,
				cmpId: DEMO_CMP_ID,
				customVendors: DEMO_CUSTOM_VENDORS,
			},
		},
		policySnapshot: {
			signingKey: DEMO_POLICY_SNAPSHOT_KEY,
			ttlSeconds: 60 * 60,
		},
		legalDocumentSnapshot: {
			signingKey: DEMO_LEGAL_DOCUMENT_SNAPSHOT.signingKey,
			issuer: DEMO_LEGAL_DOCUMENT_SNAPSHOT.issuer,
		},
		openapi: { enabled: true },
		// The cache attaches to GVL resolution, which is the only thing in the
		// backend worth caching across instances.
		gvl: { vendorIds: DEMO_IAB_VENDOR_IDS, cache: gvlCache },
	});
}

export function getDemoTermsRelease() {
	return {
		...DEMO_TERMS_RELEASE,
	};
}
