/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
  AllConsentNames,
  Callbacks,
  ConsentManagerOptions as CoreOptions,
  GTMConfiguration,
  TranslationConfig,
} from 'c15t';
import type { ComponentChildren } from 'preact';
import type { ConsentManagerDialogTheme } from '~/components/consent-manager-dialog/theme';
import type { ConsentManagerWidgetTheme } from '~/components/consent-manager-widget/theme';
import type { CookieBannerTheme } from '~/components/cookie-banner/theme';

/**
 * UI configuration options (Preact)
 *
 * Note: We keep the property name `ui` on the main options object
 * for backwards compatibility with existing consumers.
 */
export interface ReactUIOptions {
	/** Visual theme to apply. */
	theme?: CookieBannerTheme &
		ConsentManagerWidgetTheme &
		ConsentManagerDialogTheme;

	/** Whether to disable animations. @default false */
	disableAnimation?: boolean;

	/** Whether to lock scroll when dialogs are open. @default false */
	scrollLock?: boolean;

	/** Whether to trap focus within dialogs. @default true */
	trapFocus?: boolean;

	/**
	 * Colour scheme preference.
	 * Force light, dark or follow system.
	 */
	colorScheme?: 'light' | 'dark' | 'system';

	/** Whether to disable default styles. @default false */
	noStyle?: boolean;
}

/**
 * Extended configuration options for the consent manager
 */
export type ConsentManagerOptions = CoreOptions & {
	/** UI configuration options (kept under `ui` for compatibility). */
	ui?: ReactUIOptions;

	/** Translation configuration. */
	translations?: Partial<TranslationConfig>;

	/**
	 * Google Tag Manager configuration.
	 * Automatically initialises GTM when provided.
	 */
	unstable_googleTagManager?: GTMConfiguration;

	/**
	 * Whether to ignore geo location and always show the banner.
	 * Recommended to keep false in production. @default false
	 */
	ignoreGeoLocation?: boolean;

	/**
	 * Consent categories to show in the banner.
	 * @default ['necessary', 'marketing']
	 */
	consentCategories?: AllConsentNames[];

	/**
	 * Callbacks for the consent manager.
	 */
	callbacks?: Callbacks;
};

/**
 * Configuration options for the ConsentManagerProvider.
 *
 * @public
 */
export interface ConsentManagerProviderProps {
	/** Children to render within the provider. */
	children: ComponentChildren;

	/**
	 * Configuration options for the consent manager.
	 * Includes core, UI, store, and translation settings.
	 */
	options: ConsentManagerOptions;
}
