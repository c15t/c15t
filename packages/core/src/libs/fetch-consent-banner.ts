/**
 * @packageDocumentation
 * Handles fetching and processing consent banner information.
 */

import type { ContractsOutputs } from '@c15t/backend/contracts';
import {
	type TranslationConfig,
	prepareTranslationConfig,
} from '@c15t/translations';
import type { StoreApi } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../client/client-factory';
import type { PrivacyConsentState } from '../store.type';

type ConsentBannerResponse = ContractsOutputs['consent']['showBanner'];

/**
 * Configuration for fetching consent banner information
 */
interface FetchConsentBannerConfig {
	manager: ConsentManagerInterface;
	initialData?: Promise<ContractsOutputs['consent']['showBanner'] | undefined>;
	initialTranslationConfig?: Partial<TranslationConfig>;
	get: StoreApi<PrivacyConsentState>['getState'];
	set: StoreApi<PrivacyConsentState>['setState'];
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
function updateStore(
	data: ConsentBannerResponse,
	{ set, get, initialTranslationConfig }: FetchConsentBannerConfig,
	hasLocalStorageAccess: boolean
): void {
	const { consentInfo, setDetectedCountry, callbacks, ignoreGeoLocation } =
		get();

	const { translations, location, jurisdiction, showConsentBanner } = data;

	const updatedStore: Partial<PrivacyConsentState> = {
		isLoadingConsentInfo: false,
		...(consentInfo === null
			? {
					showPopup:
						(showConsentBanner && hasLocalStorageAccess) || ignoreGeoLocation,
				}
			: {}),

		// If the banner is not shown and has no requirement consent to all
		...(data.jurisdiction.code === 'NONE' &&
			!data.showConsentBanner && {
				consents: {
					necessary: true,
					functionality: true,
					experience: true,
					marketing: true,
					measurement: true,
				},
			}),
		locationInfo: {
			countryCode: location?.countryCode ?? '',
			regionCode: location?.regionCode ?? '',
		},
		jurisdictionInfo: jurisdiction,
	};

	if (translations) {
		const translationConfig = prepareTranslationConfig(
			{
				translations: {
					[translations.language]: translations.translations,
				},
				disableAutoLanguageSwitch: true,
				defaultLanguage: translations.language,
			},
			initialTranslationConfig
		);

		updatedStore.translationConfig = translationConfig;
	}

	if (data.location?.countryCode) {
		// Handle location detection callbacks
		setDetectedCountry(data.location.countryCode);
		if (data.location.regionCode) {
			callbacks.onLocationDetected?.({
				countryCode: data.location.countryCode,
				regionCode: data.location.regionCode,
			});
		}
	}

	set(updatedStore);
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
	const { get, set, manager, initialData } = config;
	const { hasConsented, callbacks } = get();

	if (typeof window === 'undefined' || hasConsented()) {
		set({ isLoadingConsentInfo: false });
		return undefined;
	}

	// Check if localStorage is available
	const hasLocalStorageAccess = checkLocalStorageAccess(set);

	if (!hasLocalStorageAccess) {
		return undefined;
	}

	set({ isLoadingConsentInfo: true });

	if (initialData) {
		const showConsentBanner = await initialData;

		// Ensures the promsie has the expected data
		if (showConsentBanner) {
			set({ isLoadingConsentInfo: false });
			updateStore(showConsentBanner, config, true);

			return showConsentBanner;
		}

		// Fall back to API call
	}

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

		if (error || !data) {
			throw new Error(`Failed to fetch consent banner info: ${error?.message}`);
		}

		// Update store with location and jurisdiction information
		// and set showPopup based on API response
		updateStore(data, config, hasLocalStorageAccess);

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
