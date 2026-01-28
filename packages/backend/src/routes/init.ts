/**
 * Init route - Initializes the consent manager and returns the initial state.
 *
 * @packageDocumentation
 */

import { initOutputSchema } from '@c15t/schema';
import { Hono } from 'hono';
import { describeRoute, resolver } from 'hono-openapi';
import { createGVLResolver } from '~/cache/gvl-resolver';
import { getJurisdiction, getLocation } from '~/handlers/init/geo';
import { getTranslationsData } from '~/handlers/init/translations';
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

			// Get accept-language header
			const acceptLanguage = request.headers.get('accept-language') || 'en';

			// Get location and jurisdiction
			const location = await getLocation(request, options);
			const jurisdiction = getJurisdiction(location, options);

			// Get translations
			const translationsResult = getTranslationsData(
				acceptLanguage,
				options.advanced?.customTranslations
			);

			// Get GVL if enabled
			let gvl = null;
			if (options.advanced?.gvl?.enabled) {
				const language = translationsResult.language.split('-')[0] || 'en';
				const gvlResolver = createGVLResolver({
					appName: options.appName || 'c15t',
					bundled: options.advanced.gvl.bundled,
					cacheAdapter: options.advanced.cache?.adapter,
					vendorIds: options.advanced.gvl.vendorIds,
					endpoint: options.advanced.gvl.endpoint,
				});
				gvl = await gvlResolver.get(language);
			}

			// Get custom vendors if configured
			const customVendors = options.advanced?.gvl?.customVendors;

			return c.json({
				jurisdiction,
				location,
				translations: translationsResult,
				branding: options.advanced?.branding || 'c15t',
				gvl,
				customVendors,
			});
		}
	);

	return app;
};
