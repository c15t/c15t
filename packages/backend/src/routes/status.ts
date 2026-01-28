/**
 * Status route - Health check and status endpoint.
 *
 * @packageDocumentation
 */

import { statusOutputSchema } from '@c15t/schema';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { statusHandler } from '~/handlers/status/status.handler';
import type { C15TContext } from '~/types';

/**
 * Creates the status route
 */
export const createStatusRoute = () => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	// GET /status - Health check and status endpoint
	app.get(
		'/',
		describeRoute({
			summary: 'Health check and API status',
			description: `Returns API version, timestamp, and client info (IP, region, user agent).

Use for health checks, load balancer probes, and debugging. Performs a lightweight DB check; returns 503 if the database is unreachable.`,
			tags: ['Status'],
			responses: {
				200: {
					description: 'API is healthy (version, timestamp, client info)',
					content: {
						'application/json': {
							schema: resolver(statusOutputSchema),
						},
					},
				},
				503: {
					description: 'Service unavailable (e.g. database unreachable)',
				},
			},
		}),
		statusHandler
	);

	return app;
};
