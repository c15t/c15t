/**
 * Store update logic for consent manager initialization.
 *
 * @packageDocumentation
 */

import type { JurisdictionCode } from '@c15t/schema/types';
import { prepareTranslationConfig } from '@c15t/translations';
import type { ConsentStoreState } from '../../store/type';
import type { ConsentState } from '../../types/compliance';
import type { GlobalVendorList } from '../../types/iab-tcf';
import { determineModel } from '../determine-model';
import { hasGlobalPrivacyControlSignal } from '../global-privacy-control';
import { initializeIABMode } from './iab-initializer';
import type { ConsentBannerResponse, InitConsentManagerConfig } from './types';

/**
 * Calculates auto-granted consents based on consent model and GPC signal.
 *
 * @param shouldAutoGrant - Whether consents should be auto-granted
 * @param hasGpcSignal - Whether Global Privacy Control signal is present
 * @returns Auto-granted consents or null if not applicable
 */
function calculateAutoGrantedConsents(
	shouldAutoGrant: boolean,
	hasGpcSignal: boolean
): ConsentState | null {
	if (!shouldAutoGrant) {
		return null;
	}

	// When a GPC signal is present, treat it as an opt-out for
	// marketing and measurement under CCPA-style rules.
	return {
		necessary: true,
		functionality: true,
		experience: true,
		marketing: !hasGpcSignal,
		measurement: !hasGpcSignal,
	};
}

/**
 * Computes auto-grant information based on jurisdiction and current state.
 *
 * @param jurisdiction - The jurisdiction code
 * @param iabEnabled - Whether IAB mode is enabled
 * @param consentInfo - Current consent info from store
 * @returns Object containing consent model and auto-granted consents
 */
function computeAutoGrantInfo(
	jurisdiction: JurisdictionCode | null,
	iabEnabled: boolean | undefined,
	consentInfo: ConsentStoreState['consentInfo']
) {
	const consentModel = determineModel(jurisdiction, iabEnabled);
	const hasGpcSignal = hasGlobalPrivacyControlSignal();

	// Auto-grant only when no regulation applies and no existing consent
	const shouldAutoGrantConsents =
		(consentModel === null || consentModel === 'opt-out') &&
		consentInfo === null;

	const autoGrantedConsents = calculateAutoGrantedConsents(
		shouldAutoGrantConsents,
		hasGpcSignal
	);

	return { consentModel, autoGrantedConsents };
}

/**
 * Builds the store update object from banner response data.
 *
 * @param data - Banner response data
 * @param config - Init configuration
 * @param hasLocalStorageAccess - Whether localStorage is accessible
 * @returns Partial store state to merge
 */
function buildStoreUpdate(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	hasLocalStorageAccess: boolean
): Partial<ConsentStoreState> {
	const { get, initialTranslationConfig } = config;
	const { consentInfo, iabConfig } = get();
	const { translations, location } = data;

	// Compute auto-grant info using helper
	const { consentModel, autoGrantedConsents } = computeAutoGrantInfo(
		(data.jurisdiction as JurisdictionCode) ?? null,
		iabConfig?.enabled,
		consentInfo
	);

	// Build base update
	const update: Partial<ConsentStoreState> = {
		model: consentModel,
		isLoadingConsentInfo: false,
		branding: data.branding ?? 'c15t',
		hasFetchedBanner: true,
		lastBannerFetchData: data,
		locationInfo: {
			countryCode: location?.countryCode ?? null,
			regionCode: location?.regionCode ?? null,
			jurisdiction: data.jurisdiction ?? null,
		},
	};

	// Show popup if no existing consent and regulation applies
	if (consentInfo === null) {
		update.showPopup = !!consentModel && hasLocalStorageAccess;
	}

	// Auto-grant consents if applicable
	if (autoGrantedConsents) {
		update.consents = autoGrantedConsents;
		update.selectedConsents = autoGrantedConsents;
	}

	// Prepare translation config
	if (translations?.language && translations?.translations) {
		update.translationConfig = prepareTranslationConfig(
			{
				translations: {
					[translations.language]: translations.translations,
				},
				disableAutoLanguageSwitch: true,
				defaultLanguage: translations.language,
			},
			initialTranslationConfig
		);
	}

	return update;
}

/**
 * Triggers callbacks after store update.
 *
 * @param data - Banner response data
 * @param config - Init configuration
 * @param autoGrantedConsents - Auto-granted consents if applicable
 */
function triggerCallbacks(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	autoGrantedConsents: ConsentState | null
): void {
	const { get } = config;
	const { callbacks } = get();
	const { translations } = data;

	// Trigger onConsentSet callback when consents are automatically granted
	if (autoGrantedConsents) {
		callbacks?.onConsentSet?.({
			preferences: autoGrantedConsents,
		});
	}

	// Trigger onBannerFetched callback
	if (translations?.language && translations?.translations) {
		callbacks?.onBannerFetched?.({
			jurisdiction: data.jurisdiction,
			location: data.location,
			translations: {
				language: translations.language,
				translations: translations.translations,
			},
		});
	}
}

/**
 * Updates the store with consent banner data.
 *
 * This function:
 * 1. Determines the consent model based on jurisdiction
 * 2. Auto-grants consents if no regulation applies
 * 3. Updates location and translation info
 * 4. Triggers appropriate callbacks
 * 5. Initializes IAB mode if enabled
 *
 * @param data - Banner response data from the API
 * @param config - Init configuration
 * @param hasLocalStorageAccess - Whether localStorage is accessible
 * @param prefetchedGVL - Optional prefetched GVL from SSR
 */
export function updateStore(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	hasLocalStorageAccess: boolean,
	prefetchedGVL?: GlobalVendorList | null
): void {
	const { set, get } = config;
	const { consentInfo, iabConfig } = get();

	// Compute auto-grant info once to be used by buildStoreUpdate and triggerCallbacks
	const { consentModel, autoGrantedConsents } = computeAutoGrantInfo(
		(data.jurisdiction as JurisdictionCode) ?? null,
		iabConfig?.enabled,
		consentInfo
	);

	// Build and apply store update
	const storeUpdate = buildStoreUpdate(data, config, hasLocalStorageAccess);
	set(storeUpdate);

	// Trigger callbacks
	triggerCallbacks(data, config, autoGrantedConsents);

	// Update scripts based on current consent state
	get().updateScripts();

	// Initialize IAB mode if enabled and in IAB jurisdiction
	if (iabConfig?.enabled && consentModel === 'iab') {
		// Non-blocking initialization - errors are handled within initializeIABMode
		initializeIABMode(iabConfig, { set, get }, prefetchedGVL).catch((err) => {
			console.error('Failed to initialize IAB mode in updateStore:', err);
		});
	}
}
