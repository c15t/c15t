/**
 * @packageDocumentation
 * Handles fetching and processing consent banner information.
 */

import type { InitOutput } from '@c15t/schema/types';
import {
	prepareTranslationConfig,
	type TranslationConfig,
} from '@c15t/translations';
import type { StoreApi } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../client/client-factory';
import type { ConsentStoreState } from '../store/type';
import { determineModel } from './determine-model';
import { hasGlobalPrivacyControlSignal } from './global-privacy-control';
import type { IABConfig } from './tcf/types';

type ConsentBannerResponse = InitOutput;

/**
 * Configuration for fetching consent banner information
 */
interface InitConsentManagerConfig {
	manager: ConsentManagerInterface;
	initialData?: Promise<InitOutput | undefined>;
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
	const { consentInfo, callbacks, iabConfig } = get();

	const { translations, location } = data;

	// Show banner only when a jurisdiction applies
	// Pass IAB enabled flag to potentially return 'iab' model for GDPR jurisdictions
	const consentModel = determineModel(data.jurisdiction, iabConfig?.enabled);

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

	// Initialize IAB mode if enabled and in IAB jurisdiction
	if (iabConfig?.enabled && consentModel === 'iab') {
		initializeIABMode(iabConfig, { set, get });
	}
}

/**
 * Initializes IAB TCF mode.
 *
 * This function:
 * 1. Initializes the IAB stub immediately (queues __tcfapi calls)
 * 2. Fetches the GVL from consent.io (filtered by configured vendors)
 * 3. Initializes the CMP API
 * 4. Loads existing TC String from storage if available
 */
async function initializeIABMode(
	iab: IABConfig,
	{ set, get }: Pick<InitConsentManagerConfig, 'set' | 'get'>
): Promise<void> {
	// Mark GVL as loading
	set({
		isLoadingGVL: true,
		nonIABVendors: iab.customVendors ?? [],
	});

	try {
		// Dynamically import IAB modules (lazy loading)
		const { initializeIABStub, fetchGVL, createCMPApi } = await import('./tcf');

		// Initialize IAB stub immediately to start queuing __tcfapi calls
		initializeIABStub();

		// Extract vendor IDs from the configuration
		const vendorIds = Object.keys(iab.vendors).map(Number);

		// Fetch GVL from consent.io (filtered by configured vendors)
		const gvl = await fetchGVL(vendorIds);

		// Update store with GVL
		set({ gvl, isLoadingGVL: false });

		// Initialize CMP API
		const cmpApi = createCMPApi({
			cmpId: iab.cmpId,
			cmpVersion: iab.cmpVersion ?? 1,
			gvl,
			gdprApplies: true,
		});

		set({ cmpApi });

		// Load existing TC String from storage if available
		const existingTcString = cmpApi.loadFromStorage();

		if (existingTcString) {
			set({ tcString: existingTcString });

			// Decode and populate consent state from TC String
			try {
				const { decodeTCString } = await import('./tcf');
				const decoded = await decodeTCString(existingTcString);

				set({
					purposeConsents: decoded.purposeConsents,
					purposeLegitimateInterests: decoded.purposeLegitimateInterests,
					vendorConsents: decoded.vendorConsents,
					vendorLegitimateInterests: decoded.vendorLegitimateInterests,
					specialFeatureOptIns: decoded.specialFeatureOptIns,
				});

				// Map IAB consents to c15t consents
				const { iabPurposesToC15tConsents } = await import('./tcf');
				const c15tConsents = iabPurposesToC15tConsents(decoded.purposeConsents);

				// Update c15t consent state
				set({
					consents: c15tConsents,
					selectedConsents: c15tConsents,
					showPopup: false, // User already has consent
				});
			} catch {
				// Invalid TC String, ignore
			}
		} else {
			// No existing consent - initialize default IAB state
			// Purpose 1 (Storage) is required, so we might auto-consent it
			// based on your compliance requirements
		}

		// Update scripts based on IAB consent state
		get().updateScripts();
	} catch (error) {
		console.error('Failed to initialize IAB mode:', error);
		set({ isLoadingGVL: false });
	}
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
