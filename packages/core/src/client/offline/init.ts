import { checkJurisdiction } from '~/libs/jurisdiction';
import { defaultTranslationConfig } from '~/translations';
import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { createResponseContext } from './utils';

/**
 * Checks if a consent banner should be shown.
 * In offline mode, will always return true unless localStorage or cookie has a value.
 */
export async function init(
	options?: FetchOptions<InitResponse>
): Promise<ResponseContext<InitResponse>> {
	// Check localStorage and cookie to see if the banner has been shown

	const country = options?.headers?.['x-c15t-country'] ?? 'GB';
	const region = options?.headers?.['x-c15t-region'] ?? null;
	const language =
		options?.headers?.['accept-language'] ??
		defaultTranslationConfig.defaultLanguage ??
		'en';

	const jurisdictionCode = checkJurisdiction(country);

	const response = createResponseContext<InitResponse>({
		jurisdiction: jurisdictionCode,
		location: { countryCode: country, regionCode: region },
		translations: defaultTranslationConfig.translations[language],
		branding: 'c15t',
	});

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}
