import { c15tInstance } from '@c15t/backend';
import { createUpstashRedisAdapter } from '@c15t/backend/cache';
import { kyselyAdapter } from '@c15t/backend/db/adapters/kysely';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely, PostgresDialect } from 'kysely';
import type { NextRequest } from 'next/server';
import { Pool } from 'pg';
import {
	DEMO_POLICY_SNAPSHOT_KEY,
	demoI18nMessages,
	demoPolicies,
} from '../../../../lib/policies';

export const postgresDb = kyselyAdapter({
	db: new Kysely({
		dialect: new PostgresDialect({
			pool: new Pool({
				connectionString: process.env.DATABASE_URL,
				ssl: { rejectUnauthorized: false },
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

const handler = c15tInstance({
	appName: 'c15t-self-host',
	basePath: '/api/self-host',
	adapter: postgresDb,
	trustedOrigins: ['localhost', 'vercel.app'],
	tenantId: 'ins_1',
	branding: 'c15t',
	i18n: {
		defaultProfile: 'default',
		fallbackLanguage: 'en',
		messages: demoI18nMessages,
	},
	policyPacks: demoPolicies,
	policySnapshot: {
		signingKey: DEMO_POLICY_SNAPSHOT_KEY,
		ttlSeconds: 60 * 60,
	},
	openapi: {
		enabled: true,
	},
	cache:
		process.env.REDIS_URL && process.env.REDIS_TOKEN
			? {
					adapter: createUpstashRedisAdapter({
						url: process.env.REDIS_URL,
						token: process.env.REDIS_TOKEN,
					}),
				}
			: undefined,
	iab: {
		enabled: true,
		cmpId: 10,
		vendorIds: [
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
			22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
			40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57,
			58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75,
			76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93,
			94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
			110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124,
			125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139,
			140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154,
			155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169,
			170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184,
			185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199,
			200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214,
			215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229,
			230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244,
			245, 246, 247, 248, 249, 250,
		],
		customVendors: [
			
		]
	},
});

const handleRequest = async (request: NextRequest) => handler.handler(request);

export {
	handleRequest as GET,
	handleRequest as POST,
	handleRequest as PATCH,
	handleRequest as OPTIONS,
};
