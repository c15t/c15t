import { type C15TOptions, c15tInstance } from '@c15t/backend';
import { kyselyAdapter } from '@c15t/backend/pkgs/db-adapters/adapters/kysely-adapter';

import type { NextRequest } from 'next/server';

const handler = c15tInstance({
	appName: 'Consent.io Dashboard',
	basePath: '/api/c15t',
	database: kyselyAdapter({
		dialect: 'postgres',

		// Optional: Enable query logging
		debug: process.env.NODE_ENV !== 'production',
		// Optional: Connection pooling settings
		pool: {
			min: 2,
			max: 10,
		},
	}),
	trustedOrigins: ['localhost', 'vercel.app', 'consent.io'],
	cors: true,
	advanced: {
		cors: {
			allowHeaders: ['content-type', 'x-request-id'],
		},
	},
	logger: {
		level: 'error',
	},
	openapi: {
		enabled: true,
	},
} satisfies C15TOptions);

// Single handler for all HTTP methods
const handleRequest = async (request: NextRequest) => handler.handler(request);

// Export the same handler for all methods
export {
	handleRequest as GET,
	handleRequest as POST,
	handleRequest as OPTIONS,
};
