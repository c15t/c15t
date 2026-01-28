import { enTranslations } from '@c15t/translations';
import { fetchGVL } from '../../libs/tcf/fetch-gvl';
import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { createResponseContext, fetcher } from './fetcher';
import type { IABFallbackConfig } from './types';

/**
 * Provides offline mode fallback for showConsentBanner API.
 * Simulates the behavior of OfflineClient when API requests fail.
 * In fallback mode, fetches GVL from gvl.consent.io when IAB is enabled.
 * @internal
 */
export async function offlineFallbackForConsentBanner(
	options?: FetchOptions<InitResponse>,
	iabConfig?: IABFallbackConfig
): Promise<ResponseContext<InitResponse>> {
	// Fetch GVL from external endpoint in offline/fallback mode
	// Only when IAB is enabled on the client
	let gvl = null;
	if (iabConfig?.enabled) {
		try {
			gvl = await fetchGVL(iabConfig.vendorIds);
		} catch (error) {
			console.warn('Failed to fetch GVL in offline fallback:', error);
		}
	}

	// Create a simulated response similar to what the API would return
	const response = createResponseContext<InitResponse>(
		true, // Mark as successful even though we're in fallback mode
		{
			jurisdiction: 'NONE', // We don't know the jurisdiction in offline mode
			location: {
				countryCode: null,
				regionCode: null,
			},
			translations: {
				language: 'en',
				translations: enTranslations,
			},
			branding: 'c15t',
			gvl,
		},
		null,
		null
	);

	// Call success callback if provided
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}

	return response;
}

/**
 * Checks if a consent banner should be shown.
 * If the API request fails, falls back to offline mode behavior.
 */
export async function init(
	context: FetcherContext,
	options?: FetchOptions<InitResponse>,
	iabConfig?: IABFallbackConfig
): Promise<ResponseContext<InitResponse>> {
	try {
		// First try to make the actual API request
		const response = await fetcher<InitResponse>(context, API_ENDPOINTS.INIT, {
			method: 'GET',
			...options,
		});

		// If the request was successful
		if (response.ok) {
			return response;
		}

		// If we got here, the request failed but didn't throw - fall back to offline mode
		console.warn(
			'API request failed, falling back to offline mode for consent banner'
		);
		return offlineFallbackForConsentBanner(options, iabConfig);
	} catch (error) {
		// If an error was thrown, fall back to offline mode
		console.warn(
			'Error fetching consent banner info, falling back to offline mode:',
			error
		);
		return offlineFallbackForConsentBanner(options, iabConfig);
	}
}
