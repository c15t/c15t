/**
 * @packageDocumentation
 * Type definitions for the consent manager components.
 */

import type {
	AllConsentNames,
	ComplianceSettings,
	TrackingBlockerConfig,
	TranslationConfig,
	c15tClient,
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
	 * An existing c15tClient instance to use.
	 * This is required for the provider to work properly.
	 */
	client: c15tClient;

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

/**
 * Props for components that need to check consent status.
 */
export interface HasConsentedProps {
	/**
	 * The consent type to check for.
	 */
	consentType?: AllConsentNames;

	/**
	 * Content to render when consent is granted.
	 */
	children: ReactNode;

	/**
	 * Optional content to render when consent is not granted.
	 */
	fallback?: ReactNode;
}

/**
 * Props for components that need to access a specific store namespace.
 */
export interface NamespaceProps {
	/**
	 * Namespace for the consent store instance.
	 */
	namespace?: string;
}
