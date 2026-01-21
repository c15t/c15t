/**
 * Consent Manager Initialization
 *
 * Handles fetching and processing consent banner information,
 * including SSR data hydration and IAB TCF mode initialization.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '../../types/iab-tcf';
import { updateStore } from './store-updater';
import type { ConsentBannerResponse, InitConsentManagerConfig } from './types';
import { checkLocalStorageAccess } from './utils';

// Re-export types for external use
export type { ConsentBannerResponse, InitConsentManagerConfig } from './types';

/**
 * Initializes the consent manager by fetching jurisdiction, location,
 * translations, and branding information.
 *
 * This function handles:
 * - SSR data hydration (uses prefetched data if available)
 * - Client-side API fetching (fallback when no SSR data)
 * - Store state updates
 * - Callback triggers
 * - IAB TCF mode initialization (if enabled)
 *
 * @param config - Configuration object containing store and manager instances
 * @returns A promise that resolves with the consent banner response
 *
 * @example
 * ```typescript
 * const response = await initConsentManager({
 *   manager: consentManager,
 *   get: store.getState,
 *   set: store.setState,
 *   initialData: ssrPrefetchedData,
 * });
 * ```
 */
export async function initConsentManager(
	config: InitConsentManagerConfig
): Promise<ConsentBannerResponse | undefined> {
	const { get, set, manager } = config;
	const { callbacks } = get();

	// Skip on server-side
	if (typeof window === 'undefined') {
		return undefined;
	}

	// Check if localStorage is available
	const hasLocalStorageAccess = checkLocalStorageAccess(set);
	if (!hasLocalStorageAccess) {
		return undefined;
	}

	set({ isLoadingConsentInfo: true });

	// Try to use SSR-prefetched data first
	const ssrResult = await tryUseSSRData(config);
	if (ssrResult) {
		return ssrResult;
	}

	// Fall back to client-side API fetch
	return fetchFromAPI(config, hasLocalStorageAccess, manager, callbacks);
}

/**
 * Attempts to use SSR-prefetched data if available.
 *
 * @param config - Init configuration
 * @returns The init data if SSR data was used, undefined otherwise
 */
async function tryUseSSRData(
	config: InitConsentManagerConfig
): Promise<ConsentBannerResponse | undefined> {
	const { initialData, get } = config;

	// Skip SSR data if overrides are present (need fresh fetch)
	if (!initialData || get().overrides) {
		return undefined;
	}

	const data = await initialData;

	if (data?.init) {
		updateStore(data.init, config, true, data.gvl);
		return data.init;
	}

	return undefined;
}

/** Default GVL endpoint */
const GVL_ENDPOINT = 'https://gvl.consent.io';

/**
 * Performs GVL fetch directly without dynamic import overhead.
 * Returns a promise immediately to enable true parallel fetching.
 */
function performGVLFetch(
	vendorIds: number[]
): Promise<GlobalVendorList | null | undefined> {
	const url = new URL(GVL_ENDPOINT);
	if (vendorIds.length > 0) {
		url.searchParams.set('vendorIds', vendorIds.join(','));
	}

	return fetch(url.toString())
		.then((response) => {
			if (response.status === 204) {
				return null;
			}
			if (!response.ok) {
				return undefined;
			}
			return response.json() as Promise<GlobalVendorList>;
		})
		.catch(() => undefined);
}

/**
 * Fetches consent data from the API.
 * When IAB is enabled, starts GVL fetch in parallel with init fetch.
 *
 * @param config - Init configuration
 * @param hasLocalStorageAccess - Whether localStorage is accessible
 * @param manager - Consent manager client
 * @param callbacks - Store callbacks
 * @returns The consent banner response or undefined on error
 */
async function fetchFromAPI(
	config: InitConsentManagerConfig,
	hasLocalStorageAccess: boolean,
	manager: InitConsentManagerConfig['manager'],
	callbacks: ReturnType<InitConsentManagerConfig['get']>['callbacks']
): Promise<ConsentBannerResponse | undefined> {
	const { get, set } = config;
	const { iabConfig } = get();

	try {
		const { language, country, region } = get().overrides ?? {};

		// Start GVL fetch in parallel if IAB is enabled
		const gvlPromise =
			iabConfig?.enabled && iabConfig.vendors
				? performGVLFetch(Object.keys(iabConfig.vendors).map(Number))
				: Promise.resolve(undefined);

		// Start init fetch
		const initPromise = manager.init({
			headers: {
				...(language && { 'accept-language': language }),
				...(country && { 'x-c15t-country': country }),
				...(region && { 'x-c15t-region': region }),
			},
			onError: callbacks.onError
				? (context) => {
						callbacks.onError?.({
							error: context.error?.message || 'Unknown error',
						});
					}
				: undefined,
		});

		// Wait for both to complete
		const [{ data, error }, gvl] = await Promise.all([initPromise, gvlPromise]);

		if (error || !data) {
			throw new Error(`Failed to fetch consent banner info: ${error?.message}`);
		}

		// Update store with prefetched GVL (if available)
		updateStore(data, config, hasLocalStorageAccess, gvl ?? undefined);

		return data as ConsentBannerResponse;
	} catch (error) {
		console.error('Error fetching consent banner information:', error);

		set({ isLoadingConsentInfo: false, showPopup: false });

		const errorMessage =
			error instanceof Error
				? error.message
				: 'Unknown error fetching consent banner information';
		callbacks.onError?.({ error: errorMessage });

		return undefined;
	}
}
