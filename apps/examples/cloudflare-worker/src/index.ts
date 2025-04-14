import { c15tInstance } from '@c15t/backend';
import { toCloudflareHandler } from '@c15t/backend/integrations/cloudflare';
import { LibsqlDialect } from '@libsql/kysely-libsql';

/**
 * Example Cloudflare Worker for c15t
 *
 * This example shows how to use c15t directly in a Cloudflare Worker
 * without any additional framework. The Cloudflare adapter handles
 * CORS and request/response processing automatically.
 */
const handler = (env: Env) => {
	// Create the c15t instance with environment variables
	const c15t = c15tInstance({
		// Use environment variables for Turso credentials
		database: new LibsqlDialect({
			url: env.TURSO_DATABASE_URL,
			authToken: env.TURSO_AUTH_TOKEN,
		}),
		basePath: '/',
		trustedOrigins: env.TRUSTED_ORIGINS as string[],
		cors: true,
		advanced: {
			cors: {
				// Allow x-request-id header that's often used in requests
				allowHeaders: ['content-type', 'x-request-id'],
				// Ensure credentials are supported
				credentials: true,
			},
			disableCSRFCheck: true,
		},
		logger: {
			level: 'debug',
			appName: 'c15t-cloudflare-example',
		},
	});

	return toCloudflareHandler(c15t);
};

// Export the fetch handler for Cloudflare Workers
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		return handler(env)(request);
	},
};

// Type definition for Cloudflare Worker environment
interface Env {
	TURSO_DATABASE_URL: string;
	TURSO_AUTH_TOKEN: string;
	TRUSTED_ORIGINS: string | string[];
}
