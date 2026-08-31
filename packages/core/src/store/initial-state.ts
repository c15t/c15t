/**
 * @packageDocumentation
 * Provides the default initial state configuration for the consent management store.
 */

import { defaultTranslationConfig } from '../translations';
import { consentTypes } from '../types';
import type { ConsentState } from '../types';
import { version } from '../version';
import type { ActiveUI, StoreRuntimeState } from './type';

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
	/** No consent UI shown initially (set to 'banner' after init if needed) */
	activeUI: 'none' as ActiveUI,

	/** Show c15t branding by default */
	branding: 'c15t',

	callbacks: {},

	config: {
		mode: 'Unknown',
		pkg: 'c15t',
		version,
	},

	consentCategories: ['necessary'],

	/** No consent information stored initially */
	consentInfo: null,

	consentTypes,

	/** Initial consent states based on default values from consent types */
	consents: consentTypes.reduce((acc, consent) => {
		acc[consent.name] = consent.defaultValue;
		return acc;
	}, {} as ConsentState),

	debug: false,

	hasFetchedBanner: false,

	/** IAB TCF state (null when not configured) */
	iab: null,

	iframeBlockerConfig: {
		disableAutomaticBlocking: false,
	},

	includeNonDisplayedConsents: false,

	initDataSource: null,

	initDataSourceDetail: null,

	/** Initial loading state for consent banner information */
	isLoadingConsentInfo: false,

	lastBannerFetchData: null,

	legalLinks: {},

	loadedScripts: {},

	locationInfo: null,

	model: 'opt-in',

	networkBlocker: undefined,

	overrides: undefined,

	policyBanner: {},

	policyCategories: null,

	policyDialog: {},

	policyScopeMode: null,

	/** Reload page when consent is revoked (recommended for privacy compliance) */
	reloadOnConsentRevoked: true,

	scriptIdMap: {},

	scripts: [],

	selectedConsents: consentTypes.reduce((acc, consent) => {
		acc[consent.name] = consent.defaultValue;
		return acc;
	}, {} as ConsentState),

	/** SSR data was not used initially */
	ssrDataUsed: false,

	/** No SSR skip reason initially (will be set during init) */
	ssrSkippedReason: null,

	storageConfig: undefined,

	translationConfig: defaultTranslationConfig,

	user: undefined,
};
