import type { InitResponse } from '../client-interface';
import {
	buildFallbackInitData,
	resolveFallbackPolicy,
} from '../shared/init-fallback';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { createResponseContext, fetcher } from './fetcher';
import type { IABFallbackConfig } from './types';

async function createFallbackContext(
	options: FetchOptions<InitResponse> | undefined,
	data: InitResponse
): Promise<ResponseContext<InitResponse>> {
	const response = createResponseContext<InitResponse>(true, data, null, null);
	if (options?.onSuccess) {
		await options.onSuccess(response);
	}
	return response;
}

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
	const fallbackPolicy = resolveFallbackPolicy({});

	// Fetch GVL from external endpoint in offline/fallback mode
	// Only when IAB is enabled on the client and the fallback policy is IAB.
	// Uses the injected IAB module's fetchGVL if available.
	let gvl = null;
	if (iabConfig?.enabled && fallbackPolicy.model === 'iab') {
		try {
			const fetchGVL = iabConfig._module?.fetchGVL;
			if (fetchGVL) {
				gvl = await fetchGVL(iabConfig.vendorIds);
			}
		} catch (error) {
			console.warn('Failed to fetch GVL in offline fallback:', error);
		}
	}

	const fallbackData = buildFallbackInitData({
		countryCode: options?.headers?.['x-c15t-country'] ?? null,
		regionCode: options?.headers?.['x-c15t-region'] ?? null,
		gvl,
		policy: fallbackPolicy,
	});

	return createFallbackContext(options, fallbackData);
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
