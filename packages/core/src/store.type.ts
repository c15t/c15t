/**
 * @packageDocumentation
 * Defines the core types and interfaces for the consent management store.
 */

import type {
	AllConsentNames,
	CallbackFunction,
	Callbacks,
	ComplianceRegion,
	ComplianceSettings,
	ConsentState,
	ConsentType,
	PrivacySettings,
	TranslationConfig,
	consentTypes,
} from './types';

/**
 * Core state and methods interface for the privacy consent management store.
 *
 * @remarks
 * This interface defines the complete API surface of the consent manager, including:
 * - State properties for tracking consent status
 * - Methods for managing consent preferences
 * - Compliance and privacy settings
 * - Callback management
 * - UI state control
 *
 * The store is typically created using {@link createConsentManagerStore} and
 * accessed through React hooks or direct store subscription.
 *
 * @example
 * Basic store usage:
 * ```typescript
 * const store = createConsentManagerStore();
 *
 * // Check consent status
 * if (store.getState().hasConsentFor('analytics')) {
 *   initializeAnalytics();
 * }
 *
 * // Update consent preferences
 * store.getState().saveConsents('all');
 * ```
 *
 * @public
 */
export interface PrivacyConsentState {
	/** Current consent states for all consent types */
	consents: ConsentState;

	/** Information about when and how consent was given */
	consentInfo: { time: number; type: 'all' | 'custom' | 'necessary' } | null;

	/** Whether to show the consent popup */
	showPopup: boolean;

	/** Active GDPR consent types */
	gdprTypes: AllConsentNames[];

	/** Whether the privacy dialog is currently open */
	isPrivacyDialogOpen: boolean;

	/** Region-specific compliance settings */
	complianceSettings: Record<ComplianceRegion, ComplianceSettings>;

	/** Event callbacks for consent actions */
	callbacks: Callbacks;

	/** User's detected country code */
	detectedCountry: string;

	/** Privacy-related settings */
	privacySettings: PrivacySettings;

	/** Translation configuration */
	translationConfig: TranslationConfig;

	/** Whether to disable all default styling */
	noStyle?: boolean;

	/**
	 * Updates the translation configuration.
	 * @param config - The new translation configuration
	 */
	setTranslationConfig: (config: TranslationConfig) => void;

	/**
	 * Updates the noStyle setting.
	 * @param noStyle - Whether to disable default styling
	 */
	setNoStyle: (noStyle: boolean) => void;

	/** Whether to include non-displayed consents in operations */
	includeNonDisplayedConsents: boolean;

	/** Available consent type configurations */
	consentTypes: ConsentType[];

	/**
	 * Updates the consent state for a specific consent type.
	 * @param name - The consent type to update
	 * @param value - The new consent value
	 */
	setConsent: (name: AllConsentNames, value: boolean) => void;

	/**
	 * Controls the visibility of the consent popup.
	 * @param show - Whether to show the popup
	 */
	/**
	 * Controls the visibility of the consent popup.
	 * @param show - Whether to show the popup
	 * @param force - When true, forcefully updates the popup state regardless of current consent customization
	 */
	setShowPopup: (show: boolean, force?: boolean) => void;

	/**
	 * Controls the visibility of the privacy dialog.
	 * @param isOpen - Whether the dialog should be open
	 */
	setIsPrivacyDialogOpen: (isOpen: boolean) => void;

	/**
	 * Saves the user's consent preferences.
	 * @param type - The type of consent being saved
	 */
	saveConsents: (type: 'all' | 'custom' | 'necessary') => void;

	/** Resets all consent preferences to their default values */
	resetConsents: () => void;

	/**
	 * Updates the active GDPR consent types.
	 * @param types - Array of consent types to activate
	 */
	setGdprTypes: (types: AllConsentNames[]) => void;

	/**
	 * Updates compliance settings for a specific region.
	 * @param region - The region to update
	 * @param settings - New compliance settings
	 */
	setComplianceSetting: (
		region: ComplianceRegion,
		settings: Partial<ComplianceSettings>
	) => void;

	/** Resets compliance settings to their default values */
	resetComplianceSettings: () => void;

	/**
	 * Sets a callback for a specific consent event.
	 * @param name - The callback event name
	 * @param callback - The callback function
	 */
	setCallback: (
		name: keyof Callbacks,
		callback: CallbackFunction | undefined
	) => void;

	/**
	 * Updates the user's detected country.
	 * @param country - The country code
	 */
	setDetectedCountry: (country: string) => void;

	/** Retrieves the list of consent types that should be displayed */
	getDisplayedConsents: () => typeof consentTypes;

	/** Checks if the user has provided any form of consent */
	hasConsented: () => boolean;

	/** Clears all consent data and resets to initial state */
	clearAllData: () => void;

	/** Updates the consent mode in external systems (e.g., analytics) */
	updateConsentMode: () => void;

	/**
	 * Updates privacy-related settings.
	 * @param settings - New privacy settings
	 */
	setPrivacySettings: (settings: Partial<PrivacySettings>) => void;

	/** Gets the effective consent states after applying privacy settings */
	getEffectiveConsents: () => ConsentState;

	/**
	 * Checks if consent has been given for a specific type.
	 * @param consentType - The consent type to check
	 */
	hasConsentFor: (consentType: AllConsentNames) => boolean;

	/**
	 * Controls whether non-displayed consents should be included.
	 * @param include - Whether to include non-displayed consents
	 */
	setIncludeNonDisplayedConsents: (include: boolean) => void;
}
