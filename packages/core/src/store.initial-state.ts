/**
 * @packageDocumentation
 * Provides the default initial state configuration for the consent management store.
 */

import { version } from '../package.json';
import type { PrivacyConsentState } from './store.type';
import { defaultTranslationConfig } from './translations';
import { type ConsentState, consentTypes } from './types';

/**
 * Default initial state for the consent management store.
 *
 * @remarks
 * This configuration establishes the baseline state for the consent manager,
 * including default consent values, compliance settings, and privacy preferences.
 *
 * Notable defaults include:
 * - All consents start with their type-specific default values
 * - GDPR compliance is globally enabled
 * - CCPA compliance is enabled for US users only
 * - Do Not Track is respected by default
 * - Only necessary and marketing consents are included in gdprTypes
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
 *   privacySettings: {
 *     honorDoNotTrack: false
 *   }
 * };
 * ```
 *
 * @public
 */
export const initialState: Omit<
	PrivacyConsentState,
	'getEffectiveConsents' | 'hasConsentFor' | 'fetchConsentBannerInfo'
> = {
	config: {
		pkg: 'c15t',
		version: version,
		mode: 'Unknown',
	},

	/** Initial consent states based on default values from consent types */
	consents: consentTypes.reduce((acc, consent) => {
		acc[consent.name] = consent.defaultValue;
		return acc;
	}, {} as ConsentState),

	/** No consent information stored initially */
	consentInfo: null,

	/** Show consent popup by default */
	showPopup: true,

	/** Initial loading state for consent banner information */
	isLoadingConsentInfo: false,

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

	/** No jurisdiction information initially */
	jurisdictionInfo: null,

	/** Default privacy settings */
	privacySettings: {
		/** Respect Do Not Track by default */
		honorDoNotTrack: true,
	},

	/** Default translation configuration */
	translationConfig: defaultTranslationConfig,

	/** Don't include non-displayed consents by default */
	includeNonDisplayedConsents: false,

	/** Use predefined consent types */
	consentTypes: consentTypes,

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
};
