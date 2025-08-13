import { c15tInstance } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters/kysely';
import { Kysely, PostgresDialect } from 'kysely';
import type { NextRequest } from 'next/server';
import { Pool } from 'pg';

const handler = c15tInstance({
	appName: 'c15t-self-host',
	basePath: '/api/c15t',
	adapter: kyselyAdapter({
		db: new Kysely({
			dialect: new PostgresDialect({
				pool: new Pool({
					connectionString: 'postgresql://postgres@localhost:5432/new-db',
				}),
			}),
		}),
		provider: 'postgresql',
	}),

	trustedOrigins: ['localhost', 'vercel.app'],
	advanced: {
		disableGeoLocation: true,
		openapi: {
			enabled: true,
		},
	},
	logger: {
		level: 'error',
	},
});

const handleRequest = async (request: NextRequest) => handler.handler(request);

export {
	handleRequest as GET,
	handleRequest as POST,
	handleRequest as OPTIONS,
};
