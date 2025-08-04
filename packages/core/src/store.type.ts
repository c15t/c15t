/**
 * @packageDocumentation
 * Defines the core types and interfaces for the consent management store.
 */

import type { HasCondition } from './libs/has';
import type {
	AllConsentNames,
	Callbacks,
	ComplianceRegion,
	ComplianceSettings,
	ConsentBannerResponse,
	ConsentState,
	ConsentType,
	JurisdictionInfo,
	LocationInfo,
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
	config: {
		pkg: string;
		version: string;
		mode: string;
		meta?: Record<string, unknown>;
	};

	/** Current consent states for all consent types */
	consents: ConsentState;

	/** Information about when and how consent was given */
	consentInfo: { time: number; type: 'all' | 'custom' | 'necessary' } | null;

	/** Whether to show the consent popup */
	showPopup: boolean;

	/** Whether consent banner information is currently being loaded */
	isLoadingConsentInfo: boolean;

	/** Whether consent banner information has been successfully fetched */
	hasFetchedBanner: boolean;

	/** Last consent banner fetch data for callback replay */
	lastBannerFetchData: ConsentBannerResponse | null;

	/** Active GDPR consent types */
	gdprTypes: AllConsentNames[];

	/** Whether the privacy dialog is currently open */
	isPrivacyDialogOpen: boolean;

	/** Region-specific compliance settings */
	complianceSettings: Record<ComplianceRegion, ComplianceSettings>;

	/** Event callbacks for consent actions */
	callbacks: Callbacks;

	/** Subject's detected country code */
	detectedCountry: string | null;

	/** Subject's location information */
	locationInfo: LocationInfo | null;

	/** Applicable jurisdiction information */
	jurisdictionInfo: JurisdictionInfo | null;

	/** Translation configuration */
	translationConfig: TranslationConfig;

	/** Whether the provider is using c15t.dev domain */
	isConsentDomain: boolean;

	/** Whether to ignore geo location. Will always show the consent banner. */
	ignoreGeoLocation: boolean;

	/**
	 * Updates the translation configuration.
	 * @param config - The new translation configuration
	 */
	setTranslationConfig: (config: TranslationConfig) => void;

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
		callback: Callbacks[keyof Callbacks] | undefined
	) => void;

	/**
	 * Updates the user's detected country.
	 * @param country - The country code
	 */
	setDetectedCountry: (country: string) => void;

	/**
	 * Updates the user's location information.
	 * @param location - The location information
	 */
	setLocationInfo: (location: LocationInfo | null) => void;

	/**
	 * Fetches consent banner information from the API and updates the store.
	 * @returns A promise that resolves with the consent banner response when the fetch is complete, or undefined if it fails
	 */
	fetchConsentBannerInfo: () => Promise<ConsentBannerResponse | undefined>;

	/** Retrieves the list of consent types that should be displayed */
	getDisplayedConsents: () => typeof consentTypes;

	/** Checks if the user has provided any form of consent */
	hasConsented: () => boolean;

	/**
	 * Evaluates whether current consent state satisfies the given condition.
	 * @param condition - The consent condition to evaluate
	 */
	has: <CategoryType extends AllConsentNames>(
		condition: HasCondition<CategoryType>
	) => boolean;
}
