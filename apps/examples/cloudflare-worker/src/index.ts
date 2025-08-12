import { c15tInstance } from '@c15t/backend/v2';
import { kyselyAdapter } from '@c15t/backend/v2/db/adapters';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';

/**
 * Example Cloudflare Worker for c15t
 *
 * This example shows how to use c15t with ORPC router in a Cloudflare Worker
 * without any additional framework.
 */
const handler = (env: Env) => {
	// Create the c15t instance with ORPC support
	const instance = c15tInstance({
		adapter: kyselyAdapter({
			db: new Kysely({
				dialect: new LibsqlDialect({
					url: 'http://127.0.0.1:8080',
				}),
			}),
			provider: 'sqlite',
		}),
		trustedOrigins: JSON.parse(env.TRUSTED_ORIGINS ?? '[]'),
		logger: {
			level: 'debug',
			appName: 'c15t-cloudflare-example',
		},
		baseURL: '/',
	});

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
	TRUSTED_ORIGINS: string;
}
