/**
 * `GET /status` — liveness and database reachability.
 *
 * Registered by `createApp`. Split by resource, mirroring `@c15t/backend`'s
 * `routes/` layout — a single file holding every route grows past the point
 * where a reviewer can hold it in mind, and makes the eventual cutover diff
 * harder to read than it needs to be.
 */

import { describeRoute } from 'hono-openapi';

import type { RouteContext } from '../context';
import { status } from '../status';

export function register({ app, options, run }: RouteContext): void {
	app.get(
		'/status',
		describeRoute({
			summary: 'Liveness and database reachability',
			tags: ['Status'],
		}),
		async (c) => {
			// Unauthenticated on purpose, matching @c15t/backend: a health check a
			// load balancer cannot reach without credentials is not a health check.
			// It exposes only version and the caller's own request metadata.
			const result = await run(
				c,
				status(c.req.raw.headers, options.version ?? '0.0.0', options.ipAddress)
			);

			if (!result.ok) {
				// 503 rather than the generic 500 a SqlError would otherwise map to:
				// orchestrators read 503 as "retry me" and 500 as "I am broken", and
				// an unreachable database is the former.
				return c.json(
					{
						message: 'Database health check failed',
						cause: { code: 'SERVICE_UNAVAILABLE' },
					},
					503
				);
			}

			return c.json(result.value);
		}
	);
}
