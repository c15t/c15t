import { Hono } from 'hono';
import { c15tInstance } from '@c15t/backend';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { env } from 'hono/adapter';

// Define a type for error data structure
interface ErrorData {
	code?: string;
	meta?: Record<string, unknown>;
	stack?: string[];
	category?: string;
	[key: string]: unknown;
}

const app = new Hono();

// Add a dedicated CORS handler for preflight requests
app.options('*', (c) => {
	const origin = c.req.header('origin') || '*';
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400', // 24 hours
			'Access-Control-Allow-Credentials': 'true',
		},
	});
});

// Initialize c15t instance
app.on(['POST', 'GET', 'HEAD'], '/*', async (c) => {
	const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, TRUSTED_ORIGINS } = env<{
		TURSO_DATABASE_URL: string;
		TURSO_AUTH_TOKEN: string;
		TRUSTED_ORIGINS: string;
	}>(c);

	if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN || !TRUSTED_ORIGINS) {
		return new Response(
			JSON.stringify({
				error: true,
				message:
					'Missing required environment variables for database connection',
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}

	// Parse trusted origins with fallback and safety handling
	let trustedOrigins: string[] = [];
	try {
		// Try to parse as JSON first
		trustedOrigins = JSON.parse(TRUSTED_ORIGINS);

		// If it's not an array, create an array
		if (!Array.isArray(trustedOrigins)) {
			trustedOrigins = [String(trustedOrigins)];
		}
	} catch (e) {
		// If JSON parsing fails, try as comma-separated string
		trustedOrigins = TRUSTED_ORIGINS.split(',').map((origin) => origin.trim());
	}

	// Log the trusted origins for debugging
	console.log('Configured trusted origins:', trustedOrigins);

	const c15t = c15tInstance({
		database: new LibsqlDialect({
			url: TURSO_DATABASE_URL,
			authToken: TURSO_AUTH_TOKEN,
		}),
		basePath: '/',
		trustedOrigins: trustedOrigins,
		// Add explicit CORS configuration
		cors: true,
		// Enable advanced CSRF checks disable for broader origin support
		advanced: {
			disableCSRFCheck: true,
		},
		logger: {
			level: 'debug',
			appName: 'c15t-core',
		},
		telemetry: {
			disabled: false,
			defaultAttributes: {
				'deployment.environment': 'example',
				'service.instance.id': 'hono-turso-example',
			},
		},
	});

	const result = await c15t.handler(c.req.raw);
	const response = await result.match(
		(response) => response,
		(error) => {
			// Get standard fields from the error
			const statusCode = error.statusCode || 500;
			const message = error.message || 'Unknown error';

			// Extract data fields using the updated structure
			const errorData = (error.data as ErrorData) || {};
			const errorCode = errorData?.code || 'UNKNOWN_ERROR';
			const errorMeta = errorData?.meta || {};
			// Stack trace can be extracted from error.data.stack if it exists there
			const stack =
				errorData?.stack ||
				error.stack?.split('\n').map((line) => line.trim()) ||
				[];

			return new Response(
				JSON.stringify(
					{
						error: true,
						message: message,
						code: errorCode,
						statusCode: statusCode,
						meta: errorMeta,
						stack: stack,
					},
					null,
					2
				),
				{
					status: statusCode,
					headers: {
						...c.res.headers,
						'Content-Type': 'application/json',
					},
				}
			);
		}
	);

	// Add CORS headers to the response
	const origin = c.req.header('origin');
	if (origin) {
		const newHeaders = new Headers(response.headers);
		newHeaders.set('Access-Control-Allow-Origin', origin);
		newHeaders.set('Access-Control-Allow-Credentials', 'true');

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: newHeaders,
		});
	}

	return response;
});

export default app;
