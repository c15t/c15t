import 'server-only';
import { c15tInstance } from '@c15t/backend';
import { createUpstashRedisAdapter } from '@c15t/backend/cache';

import { DEMO_LEGAL_DOCUMENT_SNAPSHOT } from './demo-legal-document-snapshot';
import { fetchDemoProviders } from './demo-provider-fetch';
import {
	DEMO_ADDITIONAL_CONSENT,
	DEMO_CMP_ID,
	DEMO_CUSTOM_VENDORS,
	DEMO_IAB_VENDOR_IDS,
	DEMO_POLICY_SNAPSHOT_KEY,
	demoI18nMessages,
	getScenarioPolicyRules,
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
	effectiveDate: '2026-04-13T00:00:00.000Z',
	hash: 'c15t-example-terms-v2026-04-13',
	title: 'c15t Example Terms & Conditions',
	type: 'terms_and_conditions' as const,
	version: '2026-04-13',
};

/**
 * Sites this backend trusts: browsers on them may call it cross-origin, and
 * consent saves may name them as their `domain`.
 *
 * The demo is same-origin, but its saves name the deployment's host, so that
 * host has to be listed. `isOriginTrusted` compares hostnames exactly unless
 * the entry starts with `*.`: a bare `vercel.app` entry matches nothing, and
 * `*.vercel.app` would trust every deployment on Vercel.
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

export const createDemoInstance = function createDemoInstance(
	scenario: string
) {
	const gvlCache =
		process.env.REDIS_URL && process.env.REDIS_TOKEN
			? createUpstashRedisAdapter({
					token: process.env.REDIS_TOKEN,
					url: process.env.REDIS_URL,
				})
			: undefined;

	// oxlint-disable-next-line sort-keys -- Preserve declaration order, interface shape, and public compatibility.
	return c15tInstance({
		database: postgresDb,
		basePath: '/api/self-host',
		trustedOrigins: trustedOrigins(),
		tenantId: 'ins_1',
		// Everything a client needs to render the banner now lives in one
		// manifest, built by @c15t/schema so the server and the browser resolve
		// it identically.
		manifest: {
			appName: 'c15t-self-host',
			branding: 'c15t',
			i18n: {
				defaultProfile: 'default',
				messages: demoI18nMessages,
			},
			iab: {
				// Resolved server-side and served on /init, like the vendor list.
				// The playground serves Google's list itself until
				// gvl.inth.app does; see `fetchDemoProviders`.
				additionalConsent: {
					endpoint: DEMO_ADDITIONAL_CONSENT.url,
					providers: DEMO_ADDITIONAL_CONSENT.providers,
				},
				cmpId: DEMO_CMP_ID,
				customVendors: DEMO_CUSTOM_VENDORS,
				enabled: true,
			},
			policyRules: getScenarioPolicyRules(scenario),
		},
		policySnapshot: {
			signingKey: DEMO_POLICY_SNAPSHOT_KEY,
			ttlSeconds: 60 * 60,
		},
		legalDocumentSnapshot: {
			issuer: DEMO_LEGAL_DOCUMENT_SNAPSHOT.issuer,
			signingKey: DEMO_LEGAL_DOCUMENT_SNAPSHOT.signingKey,
		},
		openapi: { enabled: true },
		// The cache attaches to GVL resolution, which is the only thing in the
		// backend worth caching across instances.
		gvl: { cache: gvlCache, vendorIds: DEMO_IAB_VENDOR_IDS },
		additionalConsent: { fetch: fetchDemoProviders },
	});
};

export const getDemoTermsRelease = function getDemoTermsRelease() {
	return {
		...DEMO_TERMS_RELEASE,
	};
};
