/**
 * Init route - Initializes the consent manager and returns the initial state.
 *
 * @packageDocumentation
 */

import { initOutputSchema } from '@c15t/schema';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { resolveInitPayload } from '~/handlers/init/resolve-init';
import type { C15TContext, C15TOptions } from '~/types';

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
- **GVL** – Global Vendor List when IAB is active for the request

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
			const ctx = c.get('c15tContext');
			const payload = await resolveInitPayload(c.req.raw, options, ctx?.logger);
			return c.json(payload);
		}
	);

	return app;
};
