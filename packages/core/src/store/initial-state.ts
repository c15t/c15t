/**
 * @packageDocumentation
 * Provides the default initial state configuration for the consent management store.
 */

import { defaultTranslationConfig } from '../translations';
import { type ConsentState, consentTypes } from '../types';
import { version } from '../version';
import type { StoreRuntimeState } from './type';

/**
 * Current storage key (v1.8+)
 *
 * @remarks
 * This is the default storage key used for both localStorage and cookies.
 * It replaces the legacy `privacy-consent-storage` key to reduce cookie size.
 * Migration from the legacy key happens automatically on first read.
 */
export const STORAGE_KEY_V2 = 'c15t';

/**
 * Legacy storage key (<= v1.7.x)
 *
 * @remarks
 * This key is maintained for backward compatibility and automatic migration.
 * New consents are stored in STORAGE_KEY_V2, and old consents are automatically
 * migrated from this key to STORAGE_KEY_V2 when accessed.
 *
 * @deprecated This key is for legacy support only. Use STORAGE_KEY_V2 instead.
 */
export const STORAGE_KEY = 'privacy-consent-storage';

/**
 * Default initial state for the consent management store.
 *
 * @remarks
 * This configuration establishes the baseline state for the consent manager,
 * including default consent values, compliance settings, and privacy preferences.
 *
 * @example
 * Using the initial state:
 * ```typescript
 * const store = createConsentManagerStore();
 *
 * // Reset to initial state
 * store.setState(initialState);
 *
 * // Extend initial state
 * const customState = {
 *   ...initialState,
 * };
 * ```
 *
 * @public
 */
export const initialState: StoreRuntimeState = {
	config: {
		pkg: 'c15t',
		version,
		mode: 'Unknown',
	},

	/** Initial consent states based on default values from consent types */
	consents: consentTypes.reduce((acc, consent) => {
		acc[consent.name] = consent.defaultValue;
		return acc;
	}, {} as ConsentState),

	selectedConsents: consentTypes.reduce((acc, consent) => {
		acc[consent.name] = consent.defaultValue;
		return acc;
	}, {} as ConsentState),

	/** No consent information stored initially */
	consentInfo: null,

	/** Show c15t branding by default */
	branding: 'c15t',

	/** Show consent popup by default */
	showPopup: true,

	/** Initial loading state for consent banner information */
	isLoadingConsentInfo: false,

	hasFetchedBanner: false,

	lastBannerFetchData: null,

	gdprTypes: ['necessary', 'marketing'],

	isPrivacyDialogOpen: false,

	callbacks: {},

	locationInfo: null,

	overrides: undefined,

	legalLinks: {},

	translationConfig: defaultTranslationConfig,

	user: undefined,

	networkBlocker: undefined,

	storageConfig: undefined,

	includeNonDisplayedConsents: false,

	consentTypes: consentTypes,

	iframeBlockerConfig: {
		disableAutomaticBlocking: false,
	},

	ignoreGeoLocation: false,

<<<<<<< HEAD:packages/core/src/store.initial-state.ts
	/** Default storage configuration (uses default storage key) */
	storageConfig: undefined,

	user: undefined,

	experimental_globalPrivacyControl: false,

	// Initialize all methods as no-ops
	setConsent: () => {
		/* no-op */
	},
	setShowPopup: () => {
		/* no-op */
	},
	setIsPrivacyDialogOpen: () => {
		/* no-op */
	},
	saveConsents: () => {
		/* no-op */
	},
	resetConsents: () => {
		/* no-op */
	},
	setGdprTypes: () => {
		/* no-op */
	},
	setCallback: () => {
		/* no-op */
	},
	setLocationInfo: () => {
		/* no-op */
	},
	getDisplayedConsents: () => [],
	hasConsented: () => false,
	setTranslationConfig: () => {
		/* no-op */
	},

	/** Initial empty scripts array */
=======
>>>>>>> de3f5a19 (refactor(core): improve store types & comments):packages/core/src/store/initial-state.ts
	scripts: [],

	loadedScripts: {},

	scriptIdMap: {},
};
