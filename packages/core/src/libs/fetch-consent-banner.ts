/**
 * @packageDocumentation
 * Handles fetching and processing consent banner information.
 */

import type { ContractsOutputs } from '@c15t/backend/contracts';
import {
	prepareTranslationConfig,
	type TranslationConfig,
} from '@c15t/translations';
import type { StoreApi } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../client/client-factory';
import type { PrivacyConsentState } from '../store.type';
import { hasGlobalPrivacyControlSignal } from './global-privacy-control';
import type { createTrackingBlocker } from './tracking-blocker';

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
	trackingBlocker?: ReturnType<typeof createTrackingBlocker> | null;
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
	{
		set,
		get,
		initialTranslationConfig,
		trackingBlocker,
	}: FetchConsentBannerConfig,
	hasLocalStorageAccess: boolean
): void {
	const {
		consentInfo,
		ignoreGeoLocation,
		callbacks,
		setDetectedCountry,
		experimental_globalPrivacyControl,
	} = get();

	const { translations, location, showConsentBanner } = data;

	// Check if consents should be automatically granted
	const shouldAutoGrantConsents =
		data.jurisdiction?.code === 'NONE' &&
		!data.showConsentBanner &&
		!consentInfo;

	const hasGpcSignal = hasGlobalPrivacyControlSignal(
		experimental_globalPrivacyControl
	);

	const autoGrantedConsents = shouldAutoGrantConsents
		? {
				necessary: true,
				functionality: true,
				experience: true,
				marketing: !hasGpcSignal,
				measurement: !hasGpcSignal,
			}
		: null;

	const updatedStore: Partial<PrivacyConsentState> = {
		isLoadingConsentInfo: false,
		branding: data.branding ?? 'c15t',
		...(consentInfo === null
			? {
					showPopup:
						(showConsentBanner && hasLocalStorageAccess) || ignoreGeoLocation,
				}
			: {}),

		// If the banner is not shown and has no requirement consent to all
		...(autoGrantedConsents && {
			consents: autoGrantedConsents,
			selectedConsents: autoGrantedConsents,
		}),
		locationInfo: {
			countryCode: location?.countryCode ?? null,
			regionCode: location?.regionCode ?? null,
			jurisdiction: data.jurisdiction?.code ?? null,
			jurisdictionMessage: data.jurisdiction?.message ?? null,
		},
		jurisdictionInfo: data.jurisdiction,
	};
	translations?.language && translations?.translations;
	{
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
	}

	// Store banner fetch data and mark as fetched
	updatedStore.hasFetchedBanner = true;
	updatedStore.lastBannerFetchData = data;

	set(updatedStore);

	// Trigger onConsentSet callback when consents are automatically granted
	if (autoGrantedConsents) {
		callbacks?.onConsentSet?.({
			preferences: autoGrantedConsents,
		});
	}

	callbacks?.onBannerFetched?.({
		showConsentBanner: data.showConsentBanner,
		jurisdiction: data.jurisdiction,
		location: data.location,
		translations: {
			language: translations.language,
			translations: translations.translations,
		},
	});

	// Update scripts based on current consent state
	trackingBlocker?.updateConsents(get().consents);
	get().updateScripts();
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
	const { callbacks } = get();

	if (typeof window === 'undefined') {
		return undefined;
	}

	// Check if localStorage is available
	const hasLocalStorageAccess = checkLocalStorageAccess(set);

	if (!hasLocalStorageAccess) {
		return undefined;
	}

	set({ isLoadingConsentInfo: true });

	// If there is any overrides we skip the initial data
	if (initialData && !get().overrides) {
		const showConsentBanner = await initialData;

		// Ensures the promise has the expected data
		if (showConsentBanner) {
			updateStore(showConsentBanner, config, true);
			return showConsentBanner;
		}
	}

	try {
		const language = get().overrides?.language;
		const country = get().overrides?.country;
		const region = get().overrides?.region;

		const { data, error } = await manager.showConsentBanner({
			headers: {
				...(language && {
					'accept-language': language,
				}),
				...(country && {
					'x-c15t-country': country,
				}),
				...(region && {
					'x-c15t-region': region,
				}),
			},
			// Add onError callback specific to this request
			onError: callbacks.onError
				? (context) => {
						if (callbacks.onError) {
							callbacks.onError({
								error: context.error?.message || 'Unknown error',
							});
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
		console.error('Error fetching consent banner information:', error);

		// Set loading state to false on error
		set({ isLoadingConsentInfo: false });

		// Call the onError callback if it exists
		const errorMessage =
			error instanceof Error
				? error.message
				: 'Unknown error fetching consent banner information';
		callbacks.onError?.({
			error: errorMessage,
		});

		// If fetch fails, default to NOT showing the banner to prevent crashes
		set({ showPopup: false });

		return undefined;
	}
}
