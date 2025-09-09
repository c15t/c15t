import { c15tInstance } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters/kysely';
import { version } from '@c15t/backend/version';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';
import type { NextRequest } from 'next/server';

const handler = c15tInstance({
	appName: 'c15t-self-host',
	basePath: '/api/c15t',
	adapter: kyselyAdapter({
		db: new Kysely({
			dialect: new LibsqlDialect({
				url: 'http://127.0.0.1:8080',
			}),
		}),
		provider: 'sqlite',
	}),

	trustedOrigins: ['localhost', 'vercel.app'],
	advanced: {
		disableGeoLocation: true,
		openapi: {
			enabled: true,
		},
	},
	logger: {
		level: 'debug',
	},
});

const handleRequest = async (request: NextRequest) => handler.handler(request);

export {
	handleRequest as GET,
	handleRequest as POST,
	handleRequest as OPTIONS,
};
