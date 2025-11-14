import { checkJurisdiction } from '~/libs/jurisdiction';
import { defaultTranslationConfig } from '~/translations';
import type { ShowConsentBannerResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { createResponseContext } from './utils';

/**
 * Checks if a consent banner should be shown.
 * In offline mode, will always return true unless localStorage or cookie has a value.
 */
export async function showConsentBanner(
	options?: FetchOptions<ShowConsentBannerResponse>
): Promise<ResponseContext<ShowConsentBannerResponse>> {
	// Check localStorage and cookie to see if the banner has been shown

	const country = options?.headers?.['x-c15t-country'] ?? 'GB';
	const region = options?.headers?.['x-c15t-region'] ?? null;
	const language =
		options?.headers?.['accept-language'] ??
		defaultTranslationConfig.defaultLanguage ??
		'en';

	const { showConsentBanner, jurisdictionCode, message } =
		checkJurisdiction(country);

	const response = createResponseContext<ShowConsentBannerResponse>({
		showConsentBanner: showConsentBanner,
		jurisdiction: {
			code: jurisdictionCode,
			message: message,
		},
		branding: 'c15t',
		location: { countryCode: country, regionCode: region },
		translations: {
			language: language,
			translations: defaultTranslationConfig.translations[language],
		},
	});

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}
