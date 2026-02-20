/**
 * Init route - Initializes the consent manager and returns the initial state.
 *
 * @packageDocumentation
 */

import { initOutputSchema } from '@c15t/schema';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { buildInitPayload } from '~/handlers/init/payload';
import type { C15TContext, C15TOptions } from '~/types';
import { getMetrics } from '~/utils/metrics';

/**
 * Creates the init route handler
 */
export const createInitRoute = (options: C15TOptions) => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	app.get(
		'/',
		describeRoute({
			summary: 'Get initial consent manager state',
			description: `Returns the initial state required to render the consent manager.

- **Jurisdiction** – User's jurisdiction (defaults to GDPR if geo-location is disabled)
- **Location** – User's location (null if geo-location is disabled)
- **Translations** – Consent manager copy (from \`Accept-Language\` header)
- **Branding** – Configured branding key
- **GVL** – Global Vendor List when enabled

Use for geo-targeted consent banners and regional compliance.`,
			tags: ['Init'],
			responses: {
				200: {
					description:
						'Initialization payload (jurisdiction, location, translations, branding, GVL)',
					content: {
						'application/json': {
							schema: resolver(initOutputSchema),
						},
					},
				},
			},
		}),
		async (c) => {
			const request = c.req.raw;
			const payload = await buildInitPayload(request, options);

			// Record init metric
			const gpc = request.headers.get('sec-gpc') === '1';
			getMetrics()?.recordInit({
				jurisdiction: payload.jurisdiction,
				country: payload.location?.countryCode ?? undefined,
				region: payload.location?.regionCode ?? undefined,
				gpc,
			});

			return c.json(payload);
		}
	);

	return app;
};
