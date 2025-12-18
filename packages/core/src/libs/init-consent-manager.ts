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
import type { ConsentStoreState } from '../store/type';
import { determineModel } from './determine-model';
import { hasGlobalPrivacyControlSignal } from './global-privacy-control';

type ConsentBannerResponse = ContractsOutputs['init'];

/**
 * Configuration for fetching consent banner information
 */
interface InitConsentManagerConfig {
	manager: ConsentManagerInterface;
	initialData?: Promise<ContractsOutputs['init'] | undefined>;
	initialTranslationConfig?: Partial<TranslationConfig>;
	get: StoreApi<ConsentStoreState>['getState'];
	set: StoreApi<ConsentStoreState>['setState'];
}

/**
 * Checks if localStorage is available and accessible
 */
function checkLocalStorageAccess(
	set: InitConsentManagerConfig['set']
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
	{ set, get, initialTranslationConfig }: InitConsentManagerConfig,
	hasLocalStorageAccess: boolean
): void {
	const { consentInfo, callbacks } = get();

	const { translations, location } = data;

	// Show banner only when a jurisdiction applies
	const consentModel = determineModel(data.jurisdiction);

	// Detect Global Privacy Control (GPC) signal on the client
	const hasGpcSignal = hasGlobalPrivacyControlSignal();

	// Check if consents should be automatically granted
	// Only auto-grant when there is no existing consent information.
	const shouldAutoGrantConsents =
		(consentModel === null || consentModel === 'opt-out') &&
		consentInfo === null;

	// Base auto-granted consents when no regulation applies.
	// When a GPC signal is present, treat it as an opt-out for
	// marketing and measurement under CCPA-style rules.
	const autoGrantedConsents = shouldAutoGrantConsents
		? {
				necessary: true,
				functionality: true,
				experience: true,
				marketing: !hasGpcSignal,
				measurement: !hasGpcSignal,
			}
		: null;

	const updatedStore: Partial<ConsentStoreState> = {
		model: consentModel,
		isLoadingConsentInfo: false,
		branding: data.branding ?? 'c15t',
		...(consentInfo === null
			? {
					showPopup: !!consentModel && hasLocalStorageAccess,
				}
			: {}),

		// If the banner is not shown and has no requirement consent to all
		...(shouldAutoGrantConsents && {
			consents: autoGrantedConsents ?? undefined,
			selectedConsents: autoGrantedConsents ?? undefined,
		}),
		locationInfo: {
			countryCode: location?.countryCode ?? null,
			regionCode: location?.regionCode ?? null,
			jurisdiction: data.jurisdiction ?? null,
		},
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

	// Store banner fetch data and mark as fetched
	updatedStore.hasFetchedBanner = true;
	updatedStore.lastBannerFetchData = data;

	set(updatedStore);

	// Trigger onConsentSet callback when consents are automatically granted
	if (autoGrantedConsents) {
		callbacks?.onConsentSet?.({
			preferences: autoGrantedConsents ?? {
				necessary: true,
				functionality: true,
				experience: true,
				marketing: true,
				measurement: true,
			},
		});
	}

	callbacks?.onBannerFetched?.({
		jurisdiction: data.jurisdiction,
		location: data.location,
		translations: {
			language: translations.language,
			translations: translations.translations,
		},
	});

	// Update scripts based on current consent state
	get().updateScripts();
}

/**
 * Fetches consent banner information from the API and updates the store.
 *
 * @param config - Configuration object containing store and manager instances
 * @returns A promise that resolves with the consent banner response when the fetch is complete
 */
export async function initConsentManager(
	config: InitConsentManagerConfig
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
		const data = await initialData;

		// Ensures the promise has the expected data
		if (data) {
			updateStore(data, config, true);
			return data;
		}
	}

	try {
		const language = get().overrides?.language;
		const country = get().overrides?.country;
		const region = get().overrides?.region;

		const { data, error } = await manager.init({
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
