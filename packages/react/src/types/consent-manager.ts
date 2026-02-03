/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
	AllConsentNames,
	Callbacks,
	ConsentManagerOptions as CoreOptions,
	GTMConfiguration,
	LegalLinks,
	Overrides,
	Script,
	StorageConfig,
	TrackingBlockerConfig,
	TranslationConfig,
	User,
} from 'c15t';
import type { ReactNode } from 'react';
import type { ConsentManagerDialogTheme } from '~/components/consent-manager-dialog/theme';
import type { ConsentManagerWidgetTheme } from '~/components/consent-manager-widget/theme';
import type { CookieBannerTheme } from '~/components/cookie-banner/theme';

/**
 * React-specific configuration options
 */
export interface ReactUIOptions {
	/**
	 * Visual theme to apply.
	 */
	theme?: CookieBannerTheme &
		ConsentManagerWidgetTheme &
		ConsentManagerDialogTheme;
	/**
	 * Whether to disable animations.
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * Whether to lock scroll when dialogs are open.
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * Whether to trap focus within dialogs.
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * Color scheme preference.
	 * With this option, you can force the theme to be light, dark or system.
	 * Otherwise, the theme will be detected if you have '.dark' classname in your document.
	 */
	colorScheme?: 'light' | 'dark' | 'system';

	/**
	 * Whether to disable default styles.
	 * @default false
	 */
	noStyle?: boolean;
}

/**
 * Extended configuration options for the React consent manager
 */
export type ConsentManagerOptions = CoreOptions & {
	/**
	 * Whether c15t should be active.
	 *
	 * @remarks
	 * When set to `false`, c15t will not fetch location or consent banner
	 * information and all consents will be treated as granted on the
	 * client side.
	 *
	 * This is useful when you want to temporarily disable consent handling
	 * (for example in certain environments) without removing the
	 * integration code.
	 *
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * React-specific UI configuration options
	 */
	react?: ReactUIOptions;

	/**
	 * Translation configuration
	 */
	translations?: Partial<TranslationConfig>;

	/**
	 * Google Tag Manager configuration.
	 * Once you set this, the consent manager will automatically setup Google Tag Manager for you.
	 */
	unstable_googleTagManager?: GTMConfiguration;

	/**
	 * Whether to ignore geo location. Will always show the consent banner.
	 * It is recommended to disable this option in production.
	 * @default false
	 */
	ignoreGeoLocation?: boolean;

	/**
	 * Consent Categories to show in the consent banner.
	 * This will be overridden if you have scripts or iframes that require different consent categories.
	 * @default ['necessary', 'marketing']
	 */
	consentCategories?: AllConsentNames[];

	/**
	 * Callbacks for the consent manager.
	 */
	callbacks?: Callbacks;

	/**
	 * Dynamically load scripts based on consent state.
	 * For scripts such as Google Tag Manager, Meta Pixel, etc.
	 *
	 * @see https://c15t.com/docs/frameworks/react/script-loader
	 */
	scripts?: Script[];

	/**
	 * Tracking blocker configuration.
	 * @deprecated This is deprecated and will be removed in the next major version. Use the new [ScriptLoader](https://c15t.com/docs/frameworks/react/script-loader) instead.
	 */
	trackingBlockerConfig?: TrackingBlockerConfig;

	/**
	 * Display links to various legal documents such as privacy policy, terms of service, etc across the consent manager.
	 * This can be used to display links in the consent banner, dialog, etc.
	 *
	 * @defaultValue {}
	 */
	legalLinks?: LegalLinks;

	/**
	 * Storage configuration options
	 *
	 * @remarks
	 * Configure storage behavior through store options for better control
	 * and testability.
	 *
	 * @see {@link StorageConfig} for available options
	 */
	storageConfig?: StorageConfig;

	/**
	 * The user's information.
	 * Usually your own internal ID for the user from your auth provider
	 *
	 * @remarks
	 * This can be set later using the {@link identifyUser} method.
	 * @default undefined
	 */
	user?: User;

	/**
	 * Forcefully set values like country, region, language for the consent manager
	 * These values will override the values detected from the browser.
	 *
	 * @defaultValue undefined
	 */
	overrides?: Overrides;

	/**
	 * Respect the Global Privacy Signal in opt-out jurisdiction, like California (CCPA).
	 * @defaultValue false
	 */
	experimental_globalPrivacyControl?: boolean;
};

/**
 * Configuration options for the ConsentManagerProvider.
 *
 * @public
 */
export interface ConsentManagerProviderProps {
	/**
	 * React children to render within the provider.
	 */
	children: ReactNode;

	/**
	 * Configuration options for the consent manager.
	 * This includes core, React, store, and translation settings.
	 */
	options: ConsentManagerOptions;
}
