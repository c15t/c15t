import type { InitOutput } from '@c15t/schema/types';
import { createGVLResolver } from '~/cache/gvl-resolver';
import type { C15TOptions } from '~/types';
import { getJurisdiction, getLocation } from './geo';
import { getTranslationsData } from './translations';

/**
 * Builds the init payload used by both `/init` and `/embed.js`.
 */
export async function buildInitPayload(
	request: Request,
	options: C15TOptions
): Promise<InitOutput> {
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
	if (options.advanced?.iab?.enabled) {
		const language = translationsResult.language.split('-')[0] || 'en';
		const gvlResolver = createGVLResolver({
			appName: options.appName || 'c15t',
			bundled: options.advanced.iab.bundled,
			cacheAdapter: options.advanced.cache?.adapter,
			vendorIds: options.advanced.iab.vendorIds,
			endpoint: options.advanced.iab.endpoint,
		});
		gvl = await gvlResolver.get(language);
	}

	// Get custom vendors if configured
	const customVendors = options.advanced?.iab?.customVendors;

	return {
		jurisdiction,
		location,
		translations: translationsResult,
		branding: options.advanced?.branding || 'c15t',
		gvl,
		customVendors,
		...(options.advanced?.iab?.cmpId != null && {
			cmpId: options.advanced.iab.cmpId,
		}),
	};
}
