import type {
	AllConsentNames,
	Callbacks,
	ConsentManagerOptions as CoreOptions,
	I18nConfig,
	IABConfig,
	LegalLinks,
	NetworkBlockerConfig,
	Overrides,
	Script,
	SSRInitialData,
	StorageConfig,
	TranslationConfig,
	User,
} from 'c15t';
import type { UIOptions } from '../theme/types';

/**
 * Store-related options that are common across UI implementations.
 */
export interface CommonInlineStoreOptions {
	/**
	 * Whether c15t should be active.
	 *
	 * @remarks
	 * When set to `false`, c15t will not run the initialization process and
	 * all consents will be treated as granted on the client side.
	 *
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Event callbacks for consent actions.
	 *
	 * @see https://c15t.com/docs/frameworks/react/callbacks
	 * @see {@link Callbacks} for available options
	 */
	callbacks?: Callbacks;

	/**
	 * Dynamically load scripts based on consent state.
	 *
	 * @see https://c15t.com/docs/frameworks/react/script-loader
	 * @see {@link Script} for available options
	 */
	scripts?: Script[];

	/**
	 * Configuration for the legal links.
	 *
	 * @remarks
	 * Legal links can display across different parts of the consent manager such
	 * as the consent banner and dialog.
	 */
	legalLinks?: LegalLinks;

	/**
	 * Storage configuration for consent persistence.
	 *
	 * @remarks
	 * Configure how consent data is stored in localStorage and cookies.
	 */
	storageConfig?: StorageConfig;

	/**
	 * The user's information.
	 * Usually your own internal ID for the user from your auth provider.
	 *
	 * @see {@link User} for available options
	 */
	user?: User;

	/**
	 * Forcefully set values like country, region, language for the consent
	 * manager. These values will override the values detected from the browser.
	 */
	overrides?: Overrides;

	/**
	 * Configuration for the network request blocker.
	 *
	 * @remarks
	 * The network blocker intercepts global `fetch` and `XMLHttpRequest`
	 * calls and blocks requests based on the current consent state and
	 * configured domain rules.
	 *
	 * @see https://c15t.com/docs/frameworks/react/network-blocker
	 * @see {@link NetworkBlockerConfig} for available options
	 */
	networkBlocker?: NetworkBlockerConfig;

	/**
	 * IAB TCF 2.3 configuration.
	 *
	 * @remarks
	 * Most users don't need this — only enable if you work with
	 * IAB-registered programmatic advertising vendors.
	 *
	 * @see https://c15t.com/docs/frameworks/react/iab/overview
	 * @see {@link IABConfig} for available options
	 */
	iab?: IABConfig;

	/**
	 * SSR-prefetched data for hydration.
	 *
	 * @remarks
	 * Pass the Promise from `fetchInitialData()` directly to this option.
	 *
	 * @see https://c15t.com/docs/frameworks/react/server-side
	 * @see {@link SSRInitialData} for the data structure
	 */
	ssrData?: Promise<SSRInitialData | undefined>;
}

/**
 * Content-related options for framework-agnostic consent managers.
 */
export interface ConsentManagerContentOptions {
	/**
	 * Preferred i18n configuration in c15t v2.
	 *
	 * @remarks
	 * If both `i18n` and legacy `translations` are provided, `i18n` takes precedence.
	 */
	i18n?: Partial<I18nConfig>;

	/**
	 * Translation configuration to seed the store with.
	 *
	 * @deprecated Use `i18n` instead.
	 *
	 * @see https://c15t.com/docs/frameworks/react/internationalization
	 * @see {@link TranslationConfig} for available options
	 */
	translations?: Partial<TranslationConfig>;

	/**
	 * Consent categories to show in the consent banner.
	 *
	 * @see https://c15t.com/docs/frameworks/react/concepts/consent-categories
	 * @see {@link AllConsentNames} for available consent categories
	 */
	consentCategories?: AllConsentNames[];
}

/**
 * Base configuration options for framework-agnostic consent managers.
 */
export type BaseConsentManagerOptions = CoreOptions &
	CommonInlineStoreOptions &
	UIOptions &
	ConsentManagerContentOptions;
