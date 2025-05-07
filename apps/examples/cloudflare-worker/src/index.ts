import { c15tInstance } from '@c15t/backend';
import { LibsqlDialect } from '@libsql/kysely-libsql';

/**
 * Example Cloudflare Worker for c15t
 *
 * This example shows how to use c15t with ORPC router in a Cloudflare Worker
 * without any additional framework.
 */
const handler = (env: Env) => {
	// Create the c15t instance with ORPC support
	const instance = c15tInstance({
		// Use environment variables for Turso credentials
		database: new LibsqlDialect({
			url: env.TURSO_DATABASE_URL,
			authToken: env.TURSO_AUTH_TOKEN,
		}),
		basePath: '/',
		trustedOrigins: env.TRUSTED_ORIGINS as string[],
		logger: {
			level: 'debug',
			appName: 'c15t-cloudflare-example',
		},
		advanced: {
			cors: {
				allowedOrigins: ['*'],
				// Allow x-request-id header that's often used in requests
				allowHeaders: ['content-type', 'x-request-id'],
				// Ensure credentials are supported
				credentials: true,
			},
			disableCSRFCheck: true,
		},
		// Add OpenAPI configuration
		openapi: {
			enabled: true,
		},
	});

	// Return a Cloudflare Worker handler
	return async (request: Request): Promise<Response> => {
		try {
			// Handle the request with ORPC
			return await instance.handler(request);
		} catch (error) {
			// Log error and return formatted error response
			console.error('Error handling request:', error);

			// Return an error response
			return new Response(
				JSON.stringify({
					error: 'Internal Server Error',
					message: error instanceof Error ? error.message : String(error),
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}
	};
};

// Export the fetch handler for Cloudflare Workers
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return await handler(env)(request);
	},
};

// Type definition for Cloudflare Worker environment
interface Env {
	TURSO_DATABASE_URL: string;
	TURSO_AUTH_TOKEN: string;
	TRUSTED_ORIGINS: string | string[];
}
