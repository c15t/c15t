/**
 * @packageDocumentation
 * Provides the default initial state configuration for the consent management store.
 */

import type { PrivacyConsentState } from './store.type';
import { defaultTranslationConfig } from './translations';
import { type ConsentState, consentTypes } from './types';
import { version } from './version';

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
export const initialState: Omit<
	PrivacyConsentState,
	| 'has'
	| 'fetchConsentBannerInfo'
	| 'getEffectiveConsents'
	| 'hasConsentFor'
	| 'setSelectedConsent'
	| 'updateScripts'
	| 'isScriptLoaded'
	| 'getLoadedScriptIds'
	| 'addScript'
	| 'addScripts'
	| 'removeScript'
	| 'setScripts'
	| 'initializeIframeBlocker'
	| 'updateIframeConsents'
	| 'destroyIframeBlocker'
	| 'updateConsentCategories'
	| 'identifyUser'
	| 'setOverrides'
> = {
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

	/** Banner has not been fetched initially */
	hasFetchedBanner: false,

	/** No last banner fetch data initially */
	lastBannerFetchData: null,

	/** Default GDPR consent types to include */
	gdprTypes: ['necessary', 'marketing'],

	/** Privacy dialog starts closed */
	isPrivacyDialogOpen: false,

	/** Default to not using c15t.dev domain */
	isConsentDomain: false,

	/** Default compliance settings per region */
	complianceSettings: {
		/** GDPR: Enabled globally by default */
		gdpr: { enabled: true, appliesGlobally: true, applies: true },

		/** CCPA: Enabled for US only */
		ccpa: { enabled: true, appliesGlobally: false, applies: undefined },

		/** LGPD: Disabled by default */
		lgpd: { enabled: false, appliesGlobally: false, applies: undefined },

		/** US State Privacy: Enabled for US only */
		usStatePrivacy: {
			enabled: true,
			appliesGlobally: false,
			applies: undefined,
		},
	},

	/** Empty callbacks object - should be populated by implementation */
	callbacks: {},

	/** Default to US if no country detected */
	detectedCountry: null,

	/** No location information initially */
	locationInfo: null,

	legalLinks: {},

	/** No jurisdiction information initially */
	jurisdictionInfo: null,

	/** Default translation configuration */
	translationConfig: defaultTranslationConfig,

	/** Don't include non-displayed consents by default */
	includeNonDisplayedConsents: false,

	/** Use predefined consent types */
	consentTypes: consentTypes,

	/** Default iframe blocker configuration */
	iframeBlockerConfig: {
		disableAutomaticBlocking: false,
	},

	/** Default to not ignoring geo location */
	ignoreGeoLocation: false,

	/** Default storage configuration (uses default storage key) */
	storageConfig: undefined,

	/** Default privacy settings */
	privacySettings: {
		/** Respect Do Not Track by default */
		honorDoNotTrack: true,
	},

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
	setComplianceSetting: () => {
		/* no-op */
	},
	resetComplianceSettings: () => {
		/* no-op */
	},
	setCallback: () => {
		/* no-op */
	},
	setDetectedCountry: () => {
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
	scripts: [],

	/** Initial empty loadedScripts record */
	loadedScripts: {},

	/** Initial empty scriptIdMap record */
	scriptIdMap: {},
};
