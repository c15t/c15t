import { type C15TOptions, c15tInstance } from '@c15t/backend';
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
		trustedOrigins: ['*'],
		logger: {
			level: 'debug',
			appName: 'c15t-cloudflare-example',
		},
		// Add OpenAPI configuration
		openapi: {
			enabled: true,
		},
	} satisfies C15TOptions);

	// Return a Cloudflare Worker handler
	return async (request: Request): Promise<Response> => {
		try {
			// Handle the request with ORPC
			return await instance.handler(request);
		} catch (error) {
			// Log error and return formatted error response
			// biome-ignore lint/suspicious/noConsole: its okay right now
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
