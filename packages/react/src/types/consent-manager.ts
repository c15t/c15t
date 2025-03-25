import type {
	AllConsentNames,
	ComplianceRegion,
	ComplianceSettings,
	NamespaceProps,
	PrivacyConsentState,
	TrackingBlockerConfig,
	TranslationConfig,
	createConsentManagerStore,
} from 'c15t';
import type { ReactNode } from 'react';
import type { ConsentManagerDialogTheme } from '../components/consent-manager-dialog/theme';
import type { CookieBannerTheme } from '../components/cookie-banner/theme';
import type { ColorScheme } from '../hooks/use-color-scheme';
/**
 * Configuration options for the ConsentManagerProvider component.
 *
 * @remarks
 * These props allow you to configure the initial state and behavior of the consent manager,
 * including GDPR types, compliance settings, and namespace configuration.
 *
 * @public
 */
export interface ConsentManagerProviderProps extends NamespaceProps {
	/**
	 * @remarks
	 * React elements to be rendered within the consent manager context.
	 */
	children: ReactNode;

	/**
	 * @remarks
	 * Array of consent types to be pre-configured for GDPR compliance.
	 * These types define what kinds of cookies and tracking are initially allowed.
	 */
	initialGdprTypes?: AllConsentNames[];

	/**
	 * @remarks
	 * Region-specific compliance settings that define how the consent manager
	 * should behave in different geographical regions.
	 */
	initialComplianceSettings?: Record<ComplianceRegion, ComplianceSettings>;
	/**
	 * @remarks
	 * Whether to skip injecting default styles
	 * @default false
	 */
	noStyle?: boolean;

	/**
	 * @remarks
	 * Whether to disable animations
	 * @default false
	 */
	disableAnimation?: boolean;

	/**
	 * @remarks
	 * Theme configuration for the consent manager
	 */
	theme?: CookieBannerTheme & ConsentManagerDialogTheme;

	/**
	 * @remarks
	 * The configuration allows you to:
	 * - Define translations for multiple languages through the translations object
	 * - Set a default language via defaultLanguage prop
	 * - Control automatic language switching based on browser settings with disableAutoLanguageSwitch
	 * - Override specific translation keys while keeping defaults for others
	 *
	 * @example
	 * ```tsx
	 * <ConsentManagerProvider
	 *   translationConfig={{
	 *     translations: {
	 *       de: {
	 *         cookieBanner: {
	 *           title: 'Cookie-Einstellungen',
	 *           description: 'Wir verwenden Cookies...'
	 *         }
	 *       }
	 *     },
	 *     defaultLanguage: 'en',
	 *     disableAutoLanguageSwitch: false
	 *   }}
	 * >
	 *   {children}
	 * </ConsentManagerProvider>
	 * ```
	 */
	translationConfig?: Partial<TranslationConfig>;

	/**
	 * @remarks
	 * The configuration allows you to:
	 * - Define translations for multiple languages through the translations object
	 * - Set a default language via defaultLanguage prop
	 * - Control automatic language switching based on browser settings with disableAutoLanguageSwitch
	 * - Override specific translation keys while keeping defaults for others
	 *
	 * @example
	 * ```tsx
	 * <ConsentManagerProvider
	 *   trackingBlockerConfig={{}}
	 * />
	 */
	trackingBlockerConfig?: TrackingBlockerConfig;

	/**
	 * @remarks
	 * Whether to lock the scroll when a modal is open, scroll lock will show the overlay
	 * @default false
	 */
	scrollLock?: boolean;

	/**
	 * Whether to trap focus when a dialog is open
	 * @default true
	 */
	trapFocus?: boolean;

	/**
	 * @remarks
	 * Color scheme to use for the consent manager, defaults to 'system'
	 * @default 'system'
	 */
	colorScheme?: ColorScheme;
}

/**
 * Internal context value interface for the consent manager.
 *
 * @remarks
 * Combines both the current state and store instance for complete
 * consent management functionality.
 *
 * @internal
 */
export interface ConsentManagerContextValue {
	/** Current privacy consent state */
	state: PrivacyConsentState;
	/** Store instance for managing consent state */
	store: ReturnType<typeof createConsentManagerStore>;
}
