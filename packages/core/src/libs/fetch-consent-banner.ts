/**
 * @packageDocumentation
 * Handles fetching and processing consent banner information.
 */

import type { StoreApi } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../client/client-factory';
import type { PrivacyConsentState } from '../store.type';
import type { ConsentBannerResponse } from '../types/compliance';
import { getCookie } from './cookie-utils';

/**
 * Configuration for fetching consent banner information
 */
interface FetchConsentBannerConfig {
	manager: ConsentManagerInterface;
	get: StoreApi<PrivacyConsentState>['getState'];
	set: StoreApi<PrivacyConsentState>['setState'];
}

/**
 * Gets the value of the show-consent-banner cookie and handles all related state updates
 */
function getConsentBannerCookie(
	config: FetchConsentBannerConfig
): ConsentBannerResponse | null {
	if (typeof document === 'undefined') {
		return null;
	}

	const cookie = getCookie('show-consent-banner');

	if (!cookie) {
		return null;
	}

	try {
		const cookieData = JSON.parse(cookie) as ConsentBannerResponse;
		const { get } = config;
		const { callbacks, setDetectedCountry } = get();

		// Update store with location and jurisdiction information from cookie
		updateStoreWithBannerData(cookieData, config, true);

		// Handle location detection callbacks
		if (cookieData.location?.countryCode) {
			setDetectedCountry(cookieData.location.countryCode);
			if (cookieData.location.regionCode) {
				callbacks.onLocationDetected?.({
					countryCode: cookieData.location.countryCode,
					regionCode: cookieData.location.regionCode,
				});
			}
		}

		return cookieData;
	} catch (error) {
		console.warn('Failed to parse consent banner cookie:', error);
		return null;
	}
}

/**
 * Checks if localStorage is available and accessible
 */
function checkLocalStorageAccess(
	set: FetchConsentBannerConfig['set']
): boolean {
	try {
		if (window.localStorage) {
			window.localStorage.setItem('c15t-storage-test-key', 'test');
			window.localStorage.removeItem('c15t-storage-test-key');
			return true;
		}
	} catch (error) {
		console.warn('localStorage not available, skipping consent banner:', error);
		set({ isLoadingConsentInfo: false, showPopup: false });
	}
	return false;
}

/**
 * Updates store with consent banner data
 */
function updateStoreWithBannerData(
	data: ConsentBannerResponse,
	{ set, get }: FetchConsentBannerConfig,
	hasLocalStorageAccess: boolean
): void {
	const { consentInfo } = get();

	set({
		locationInfo: {
			countryCode: data.location?.countryCode ?? '',
			regionCode: data.location?.regionCode ?? '',
		},
		jurisdictionInfo: data.jurisdiction,
		isLoadingConsentInfo: false,
		...(consentInfo === null
			? { showPopup: data.showConsentBanner && hasLocalStorageAccess }
			: {}),
	});
}

/**
 * Fetches consent banner information from the API and updates the store.
 *
 * @param config - Configuration object containing store and manager instances
 * @returns A promise that resolves with the consent banner response when the fetch is complete
 */
export async function fetchConsentBannerInfo(
	config: FetchConsentBannerConfig
): Promise<ConsentBannerResponse | undefined> {
	const { get, set, manager } = config;
	const { hasConsented, callbacks, consentInfo } = get();

	if (typeof window === 'undefined' || hasConsented()) {
		set({ isLoadingConsentInfo: false });
		return undefined;
	}

	// Check if localStorage is available
	const hasLocalStorageAccess = checkLocalStorageAccess(set);
	if (!hasLocalStorageAccess) {
		return undefined;
	}

	// Try to get data from cookie first
	const cookieData = getConsentBannerCookie(config);
	if (cookieData) {
		return cookieData;
	}

	// Fall back to API call
	set({ isLoadingConsentInfo: true });

	try {
		// Let the client handle offline mode internally
		const { data, error } = await manager.showConsentBanner({
			// Add onError callback specific to this request
			onError: callbacks.onError
				? (context) => {
						if (callbacks.onError) {
							callbacks.onError(context.error?.message || 'Unknown error');
						}
					}
				: undefined,
		});

		if (error) {
			throw new Error(`Failed to fetch consent banner info: ${error.message}`);
		}

		if (!data) {
			// In offline mode, data will be null, so we should show the banner by default
			// but only if we have localStorage access
			set({
				isLoadingConsentInfo: false,
				// Only update showPopup if we don't have stored consent and have localStorage access
				...(consentInfo === null && hasLocalStorageAccess
					? { showPopup: true }
					: {}),
			});
			return undefined;
		}

		// Update store with location and jurisdiction information
		// and set showPopup based on API response
		updateStoreWithBannerData(data, config, hasLocalStorageAccess);

		// Type assertion to ensure data matches ConsentBannerResponse type
		return data as ConsentBannerResponse;
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: <explanation>
		console.error('Error fetching consent banner information:', error);

		// Set loading state to false on error
		set({ isLoadingConsentInfo: false });

		// Call the onError callback if it exists
		const errorMessage =
			error instanceof Error
				? error.message
				: 'Unknown error fetching consent banner information';
		callbacks.onError?.(errorMessage);

		// If fetch fails, default to NOT showing the banner to prevent crashes
		set({ showPopup: false });

		return undefined;
	}
}
