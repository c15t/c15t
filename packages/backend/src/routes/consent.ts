/**
 * Consent routes - Check consent status.
 *
 * @packageDocumentation
 */

import {
	checkConsentOutputSchema,
	checkConsentQuerySchema,
} from '@c15t/schema';
import { Hono } from 'hono';
import { describeRoute, resolver, validator as vValidator } from 'hono-openapi';
import { checkConsentHandler } from '~/handlers/consent/check.handler';
import type { C15TContext } from '~/types';

/**
 * Creates the consent routes
 */
export const createConsentRoutes = () => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	// GET /consents/check - Check consent status for an external ID
	app.get(
		'/check',
		describeRoute({
			summary: 'Check consent by external user ID',
			description: `Pre-banner cross-device consent check. Use to avoid showing the banner when the user has already consented on another device.

**Query parameters:**
- \`externalId\` – External user ID to check
- \`type\` – Consent type(s) to check (comma-separated)`,
			tags: ['Consent'],
			responses: {
				200: {
					description: 'Consent check result per requested type(s)',
					content: {
						'application/json': {
							schema: resolver(checkConsentOutputSchema),
						},
					},
				},
				422: {
					description: 'Invalid or missing query parameters',
				},
			},
		}),
		vValidator('query', checkConsentQuerySchema),
		checkConsentHandler
	);

	return app;
};
