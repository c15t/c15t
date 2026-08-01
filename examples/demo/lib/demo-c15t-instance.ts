import 'server-only';

import { c15tInstance } from '@c15t/backend';
import { createUpstashRedisAdapter } from '@c15t/backend/cache';
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
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

function resolvePostgresSslConfig(connectionString?: string) {
	if (!connectionString) {
		return undefined;
	}

	try {
		const hostname = new URL(connectionString).hostname;
		const isLocalhost =
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname === '::1';

		return isLocalhost
			? { rejectUnauthorized: false }
			: { rejectUnauthorized: true };
	} catch {
		return process.env.NODE_ENV === 'development'
			? { rejectUnauthorized: false }
			: { rejectUnauthorized: true };
	}
}

export const postgresDb = kyselyAdapter({
	db: new Kysely({
		dialect: new PostgresDialect({
			pool: new Pool({
				connectionString: process.env.DATABASE_URL,
				ssl: resolvePostgresSslConfig(process.env.DATABASE_URL),
			}),
		}),
	}),
	provider: 'postgresql',
});

export const tursoDb = kyselyAdapter({
	db: new Kysely({
		dialect: new LibsqlDialect({
			url: 'http://127.0.0.1:8080',
		}),
	}),
	provider: 'sqlite',
});

export const DEMO_TERMS_RELEASE = {
	title: 'c15t Example Terms & Conditions',
	type: 'terms_and_conditions' as const,
	version: '2026-04-13',
	hash: 'c15t-example-terms-v2026-04-13',
	effectiveDate: '2026-04-13T00:00:00.000Z',
};

export function createDemoInstance(scenario = DEFAULT_SCENARIO_ID) {
	let cacheConfig:
		| {
				adapter: ReturnType<typeof createUpstashRedisAdapter>;
		  }
		| undefined;

	if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
		cacheConfig = {
			adapter: createUpstashRedisAdapter({
				url: process.env.REDIS_URL,
				token: process.env.REDIS_TOKEN,
			}),
		};
	}

	return c15tInstance({
		appName: 'c15t-self-host',
		basePath: '/api/self-host',
		adapter: postgresDb,
		trustedOrigins: ['localhost', '*.localhost', 'vercel.app'],
		tenantId: 'ins_1',
		branding: 'c15t',
		i18n: {
			defaultProfile: 'default',
			messages: demoI18nMessages,
		},
		policyPacks: getScenarioPolicyPacks(scenario),
		policySnapshot: {
			signingKey: DEMO_POLICY_SNAPSHOT_KEY,
			ttlSeconds: 60 * 60,
		},
		legalDocumentSnapshot: {
			signingKey: DEMO_LEGAL_DOCUMENT_SNAPSHOT.signingKey,
			issuer: DEMO_LEGAL_DOCUMENT_SNAPSHOT.issuer,
		},
		openapi: {
			enabled: true,
		},
		cache: cacheConfig,
		iab: {
			enabled: true,
			cmpId: DEMO_CMP_ID,
			vendorIds: DEMO_IAB_VENDOR_IDS,
			customVendors: DEMO_CUSTOM_VENDORS,
		},
	});
}

export function getDemoTermsRelease() {
	return {
		...DEMO_TERMS_RELEASE,
	};
}
