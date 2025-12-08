import { enTranslations } from '@c15t/translations';
import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { createResponseContext, fetcher } from './fetcher';

/**
 * Provides offline mode fallback for showConsentBanner API.
 * Simulates the behavior of OfflineClient when API requests fail.
 * @internal
 */
export async function offlineFallbackForConsentBanner(
	options?: FetchOptions<InitResponse>
): Promise<ResponseContext<InitResponse>> {
	// Check localStorage to see if the banner has been shown
	let shouldShow = true;
	let hasLocalStorageAccess = false;

	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			// Test localStorage access with a simple operation
			window.localStorage.setItem('c15t-storage-test-key', 'test');
			window.localStorage.removeItem('c15t-storage-test-key');
			hasLocalStorageAccess = true;

			const storedConsent = window.localStorage.getItem('c15t-consent');
			shouldShow = storedConsent === null;
		}
	} catch (error) {
		// Ignore localStorage errors (e.g., in environments where it's blocked)
		console.warn('Failed to access localStorage in offline fallback:', error);
		// Default to not showing if localStorage isn't available to prevent memory leaks
		shouldShow = false;
	}

	// Create a simulated response similar to what the API would return
	const response = createResponseContext<InitResponse>(
		true, // Mark as successful even though we're in fallback mode
		{
			showConsentBanner: shouldShow && hasLocalStorageAccess,
			jurisdiction: {
				code: 'NONE', // We don't know the jurisdiction in offline mode
				message: 'Unknown (offline mode)',
			},
			location: {
				countryCode: null,
				regionCode: null,
			},
			translations: enTranslations,
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
	options?: FetchOptions<InitResponse>
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
		return offlineFallbackForConsentBanner(options);
	} catch (error) {
		// If an error was thrown, fall back to offline mode
		console.warn(
			'Error fetching consent banner info, falling back to offline mode:',
			error
		);
		return offlineFallbackForConsentBanner(options);
	}
}
