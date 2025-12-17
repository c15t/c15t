/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
	AllConsentNames,
	ConsentManagerOptions as CoreOptions,
	StoreOptions,
	TranslationConfig,
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
 * Store-related options that are exposed at the top-level React configuration.
 *
 * @remarks
 * These are a curated subset of the full {@link StoreOptions} surface that are
 * commonly configured via the React provider. Advanced options can still be
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
 * Extended configuration options for the React consent manager.
 *
 * @remarks
 * This type composes:
 * - Core client options from {@link CoreOptions}
 * - A curated subset of store options from {@link StoreOptions}
 * - React-specific UI and translation configuration
 */
export type ConsentManagerOptions = CoreOptions &
	InlineStoreOptions & {
		/**
		 * React-specific UI configuration options.
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
	 * React children to render within the provider.
	 */
	children: ReactNode;

	/**
	 * Configuration options for the consent manager.
	 * This includes core, React, store, and translation settings.
	 */
	options: ConsentManagerOptions;
}
