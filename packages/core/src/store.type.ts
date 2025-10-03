/**
 * @packageDocumentation
 * Defines the core types and interfaces for the consent management store.
 */

import type { ContractsOutputs } from '@c15t/backend/contracts';
import type { HasCondition } from './libs/has';
import type { IframeBlockerConfig } from './libs/iframe-blocker';
import type { Script } from './libs/script-loader';
import type {
	AllConsentNames,
	Callbacks,
	ComplianceRegion,
	ComplianceSettings,
	ConsentBannerResponse,
	ConsentState,
	ConsentType,
	consentTypes,
	JurisdictionInfo,
	LocationInfo,
	PrivacySettings,
	TranslationConfig,
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

	/** Whether to show the branding */
	branding: ContractsOutputs['consent']['showBanner']['branding'];

	/** Current consent states for all consent types */
	consents: ConsentState;

	/** Selected consents (Not Saved) - use saveConsents to save */
	selectedConsents: ConsentState;

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

	/** Event callbacks for consent actions */
	callbacks: Callbacks;

	/** Subject's location information */
	locationInfo: LocationInfo | null;

	/** Translation configuration */
	translationConfig: TranslationConfig;

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

	/** Configuration for the iframe blocker */
	iframeBlockerConfig: IframeBlockerConfig;

	/*
	 * Updates the selected consent state for a specific consent type.
	 * @param name - The consent type to update
	 * @param value - The new consent value
	 */
	setSelectedConsent: (name: AllConsentNames, value: boolean) => void;

	/**
	 * Saves the user's consent preferences.
	 * @param type - The type of consent being saved
	 */
	saveConsents: (type: 'all' | 'custom' | 'necessary') => void;

	/**
	 * Updates the consent state for a specific consent type & automatically save the consent.
	 * @param name - The consent type to update
	 * @param value - The new consent value
	 */
	setConsent: (name: AllConsentNames, value: boolean) => void;

	/** Resets all consent preferences to their default values */
	resetConsents: () => void;

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
	 * Updates the active GDPR consent types.
	 * @param types - Array of consent types to activate
	 */
	setGdprTypes: (types: AllConsentNames[]) => void;

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
	 * Checks if consent has been given for a specific type.
	 * @param consentType - The consent type to check
	 * @deprecated will be removed in a future version
	 */
	hasConsentFor: (consentType: AllConsentNames) => boolean;

	/**
	 * Evaluates whether current consent state satisfies the given condition.
	 * @param condition - The consent condition to evaluate
	 */
	has: <CategoryType extends AllConsentNames>(
		condition: HasCondition<CategoryType>
	) => boolean;

	/**
	 * Deprecated variables and methods thatwill be removed in a future version
	 */

	/** Whether the provider is using c15t.dev domain  @deprecated will be removed in a future version */
	isConsentDomain: boolean;

	/** Subject's detected country code @deprecated will be removed in a future version - use locationInfo instead */
	detectedCountry: string | null;

	/** Privacy Related Settings @deprecated will be removed in a future version */
	privacySettings: PrivacySettings;

	/** Region-specific compliance settings @deprecated will be removed in a future version due to unused functionality */
	complianceSettings: Record<ComplianceRegion, ComplianceSettings>;

	/** Applicable jurisdiction information @deprecated will be removed in a future version use locationInfo instead */
	jurisdictionInfo: JurisdictionInfo | null;

	/** Gets the effective consent states after applying privacy settings @deprecated will be removed in a future version */
	getEffectiveConsents: () => ConsentState;

	/**
	 * Updates the user's detected country.
	 * @param country - The country code
	 * @deprecated will be removed in a future version - use setLocationInfo instead
	 */
	setDetectedCountry: (country: string) => void;

	/** Resets compliance settings to their default values @deprecated will be removed in a future version due to unused functionality */
	resetComplianceSettings: () => void;

	/**
	 * Updates compliance settings for a specific region.
	 * @param region - The region to update
	 * @param settings - New compliance settings
	 * @deprecated will be removed in a future version due to unused functionality
	 */
	setComplianceSetting: (
		region: ComplianceRegion,
		settings: Partial<ComplianceSettings>
	) => void;

	/**
	 * Script management section
	 */

	/** Array of script configurations to manage */
	scripts: Script[];

	/** Map of currently loaded script IDs to a boolean loaded-state */
	loadedScripts: Record<string, boolean>;

	/** Map of anonymized script IDs to their original IDs */
	scriptIdMap: Record<string, string>;

	/**
	 * Sets multiple script configurations to the store.
	 * @param scripts - Array of script configurations to add
	 */
	setScripts: (scripts: Script[]) => void;

	/**
	 * Removes a script configuration from the store.
	 * @param scriptId - ID of the script to remove
	 */
	removeScript: (scriptId: string) => void;

	/**
	 * Updates scripts based on current consent state.
	 * Loads scripts that have consent and aren't loaded yet.
	 * Unloads scripts that no longer have consent.
	 * @returns Object containing arrays of loaded and unloaded script IDs
	 */
	updateScripts: () => { loaded: string[]; unloaded: string[] };

	/**
	 * Checks if a script is currently loaded.
	 * @param scriptId - ID of the script to check
	 * @returns True if the script is loaded, false otherwise
	 */
	isScriptLoaded: (scriptId: string) => boolean;

	/**
	 * Gets all currently loaded script IDs.
	 * @returns Array of loaded script IDs
	 */
	getLoadedScriptIds: () => string[];

	/** Initializes the iframe blocker instance. */
	initializeIframeBlocker: () => void;

	/** Updates consents for the iframe blocker. */
	updateIframeConsents: () => void;

	/** Destroys the iframe blocker instance. */
	destroyIframeBlocker: () => void;
}
