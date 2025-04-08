/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
	AllConsentNames,
	ComplianceSettings,
	ConsentClientInterface,
	TrackingBlockerConfig,
	TranslationConfig,
} from 'c15t';
import type { ReactNode } from 'react';

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
	 * Initial GDPR consent types to activate.
	 */
	initialGdprTypes?: AllConsentNames[];

	/**
	 * Initial compliance settings for different regions.
	 */
	initialComplianceSettings?: Record<string, Partial<ComplianceSettings>>;

	/**
	 * Custom namespace for the store instance.
	 * @default 'c15tStore'
	 */
	namespace?: string;

	/**
	 * Whether to disable default styles.
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * Custom translation configuration.
	 */
	translationConfig?: Partial<TranslationConfig>;

	/**
	 * Configuration for the tracking blocker.
	 */
	trackingBlockerConfig?: TrackingBlockerConfig;

	/**
	 * An existing client instance to use.
	 * This is required for the provider to work properly.
	 */
	client: ConsentClientInterface;

	/**
	 * Visual theme to apply.
	 */
	theme?: 'light' | 'dark';

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
	 * @default 'system'
	 */
	colorScheme?: 'light' | 'dark' | 'system';
}
