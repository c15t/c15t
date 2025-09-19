/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
	AllConsentNames,
	Callbacks,
	ConsentManagerOptions as CoreOptions,
	GTMConfiguration,
	TrackingBlockerConfig,
	TranslationConfig,
} from 'c15t';
import type { ReactNode } from 'react';
import type { ConsentManagerDialogTheme } from '~/components/consent-manager-dialog/theme';
import type { ConsentManagerWidgetTheme } from '~/components/consent-manager-widget/theme';
import type { CookieBannerTheme } from '~/components/cookie-banner/theme';
import type { ReactScript } from '~/components/script-loader/script-loader';

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
	 * @default ['necessary', 'marketing']
	 */
	consentCategories?: AllConsentNames[];

	/**
	 * Callbacks for the consent manager.
	 */
	callbacks?: Callbacks;

	/**
	 * Scripts to load.
	 */
	scripts?: ReactScript[];

	/**
	 * Tracking blocker configuration.
	 * @deprecated This is deprecated and will be removed in the next major version. Use the new [ScriptLoader](https://c15t.com/docs/react/script-loader) instead.
	 */
	trackingBlockerConfig?: TrackingBlockerConfig;
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
