/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
	ConsentManagerOptions as CoreOptions,
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
