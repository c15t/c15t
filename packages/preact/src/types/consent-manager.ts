/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type { ConsentManagerDialogTheme } from '@c15t/styles/components/consent-manager-dialog';
import type { ConsentManagerWidgetTheme } from '@c15t/styles/components/consent-manager-widget';
import type { CookieBannerTheme } from '@c15t/styles/components/cookie-banner';
import type {
	AllConsentNames,
	ConsentManagerOptions as CoreOptions,
	StoreOptions,
	TranslationConfig,
} from 'c15t';
import type { ComponentChildren } from 'preact';

/**
 * Preact-specific configuration options
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
 * Store-related options that are exposed at the top-level Preact configuration.
 *
 * @remarks
 * These are a curated subset of the full {@link StoreOptions} surface that are
 * commonly configured via the Preact provider. Advanced options can still be
 * provided through the `store` property on {@link ConsentManagerOptions}.
 */
type InlineStoreOptions = Pick<
	StoreOptions,
	| 'enabled'
	| 'callbacks'
	| 'scripts'
	| 'legalLinks'
	| 'storageConfig'
	| 'user'
	| 'overrides'
	| 'networkBlocker'
>;

/**
 * Extended configuration options for the Preact consent manager.
 *
 * @remarks
 * This type composes:
 * - Core client options from {@link CoreOptions}
 * - A curated subset of store options from {@link StoreOptions}
 * - Preact-specific UI and translation configuration
 */
export type ConsentManagerOptions = CoreOptions &
	InlineStoreOptions & {
		/**
		 * Preact-specific UI configuration options.
		 */
		react?: ReactUIOptions;

		/**
		 * Translation configuration to seed the store with.
		 */
		translations?: Partial<TranslationConfig>;

		/**
		 * Consent categories to show in the consent banner.
		 * This will be overridden if you have scripts or iframes that require
		 * different consent categories.
		 *
		 * @default ['necessary', 'marketing']
		 */
		consentCategories?: AllConsentNames[];
	};

/**
 * Configuration options for the ConsentManagerProvider.
 *
 * @public
 */
export interface ConsentManagerProviderProps {
	/**
	 * Preact children to render within the provider.
	 */
	children: ComponentChildren;

	/**
	 * Configuration options for the consent manager.
	 * This includes core, Preact, store, and translation settings.
	 */
	options: ConsentManagerOptions;
}
