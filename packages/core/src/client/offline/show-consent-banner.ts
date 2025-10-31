import { defaultTranslationConfig } from '~/translations';
import { getConsentFromStorage } from '../../libs/cookie';
import type { ShowConsentBannerResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { createResponseContext } from './utils';

/**
 * Checks if a consent banner should be shown.
 * In offline mode, will always return true unless localStorage or cookie has a value.
 */
export async function showConsentBanner(
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<ShowConsentBannerResponse>
): Promise<ResponseContext<ShowConsentBannerResponse>> {
	// Check localStorage and cookie to see if the banner has been shown
	let shouldShow = true;

	try {
		if (typeof window !== 'undefined') {
			const storedConsent = getConsentFromStorage(storageConfig);
			shouldShow = storedConsent === null;
		}
	} catch (error) {
		// Ignore storage errors (e.g., in environments where it's blocked)
		console.warn('Failed to access storage:', error);
		// If storage is unavailable, default to not showing the banner
		// to prevent repeated failed attempts causing memory leaks
		shouldShow = false;
	}

	const response = createResponseContext<ShowConsentBannerResponse>({
		showConsentBanner: shouldShow,
		jurisdiction: {
			code: 'GDPR',
			message: 'EU',
		},
		branding: 'c15t',
		location: { countryCode: 'GB', regionCode: null },
		translations: {
			language: defaultTranslationConfig.defaultLanguage,
			translations:
				defaultTranslationConfig.translations[
					defaultTranslationConfig.defaultLanguage ?? 'en'
				],
		},
	});

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}
