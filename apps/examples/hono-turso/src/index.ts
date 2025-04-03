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

// Initialize c15t instance

app.on(['POST', 'GET', 'OPTIONS', 'HEAD'], '/*', async (c) => {
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
	const c15t = c15tInstance({
		database: new LibsqlDialect({
			url: TURSO_DATABASE_URL,
			authToken: TURSO_AUTH_TOKEN,
		}),
		basePath: '/',
		trustedOrigins: JSON.parse(TRUSTED_ORIGINS),
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
	return result.match(
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
});

export default app;
