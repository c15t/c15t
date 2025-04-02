import { Hono } from 'hono';
import { c15tInstance } from '@c15t/backend';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { env } from 'hono/adapter';

const app = new Hono();

// Initialize c15t instance

app.on(['POST', 'GET', 'OPTIONS', 'HEAD'], '/*', async (c) => {
	try {
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
		});

		const result = await c15t.handler(c.req.raw);
		return result.match(
			(response) => response,
			(error) => {
				return new Response(
					JSON.stringify({
						error: true,
						message: error.message,
						code: error.code,
					}),
					{
						status: error.status || 500,
						headers: {
							...c.res.headers,
							'Content-Type': 'application/json',
						},
					}
				);
			}
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: true,
				message:
					error instanceof Error ? error.message : 'Internal Server Error',
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}
});

export default app;
