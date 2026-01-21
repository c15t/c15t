/**
 * @packageDocumentation
 * Defines the core types and interfaces for the consent management store.
 */

import type { Branding, InitOutput } from '@c15t/schema/types';
import type { Model } from '~/libs/determine-model';
import type { StorageConfig } from '../libs/cookie';
import type { HasCondition } from '../libs/has';
import type { IframeBlockerConfig } from '../libs/iframe-blocker';
import type { NetworkBlockerConfig } from '../libs/network-blocker';
import type { Script } from '../libs/script-loader';
import type { CMPApi, IABConfig } from '../libs/tcf/types';
import type {
	AllConsentNames,
	Callbacks,
	ConsentBannerResponse,
	ConsentInfo,
	ConsentState,
	ConsentType,
	consentTypes,
	GlobalVendorList,
	LegalLinks,
	LocationInfo,
	Overrides,
	TranslationConfig,
	User,
} from '../types';
import type { NonIABVendor } from '../types/non-iab-vendor';

/**
 * Initial data structure for SSR prefetching.
 *
 * @remarks
 * When using frameworks like Next.js, both init and GVL data can be
 * prefetched in parallel on the server and passed to the client.
 *
 * @public
 */
export interface SSRInitialData {
	/**
	 * Init endpoint response with jurisdiction, location, and translations.
	 */
	init: InitOutput | undefined;

	/**
	 * Global Vendor List data for IAB TCF mode.
	 * - `undefined` means IAB is not enabled or fetch wasn't attempted
	 * - `null` means the user is in a non-IAB region (204 response)
	 * - `GlobalVendorList` contains the vendor list data
	 */
	gvl?: GlobalVendorList | null;
}

/**
 * Shared configuration-related properties between store options and runtime state.
 *
 * @remarks
 * This interface centralizes common configuration fields to keep TSDoc comments
 * and types in sync between {@link StoreOptions} and {@link ConsentStoreState}.
 *
 * @public
 */
export interface StoreConfig {
	/**
	 * Configuration for the consent manager.
	 *
	 * @see {@link StoreMetaConfig} for available options
	 */
	config: StoreMetaConfig;

	/**
	 * Configuration for the legal links
	 *
	 * @remarks
	 * Legal links can display across different parts of the consent manager such
	 * as the consent banner & dialog.
	 */
	legalLinks: LegalLinks;

	/**
	 * Storage configuration for consent persistence.
	 *
	 * @remarks
	 * Configure how consent data is stored in localStorage and cookies.
	 */
	storageConfig?: StorageConfig;

	/**
	 * The user's information.
	 * Usually your own internal ID for the user from your auth provider.
	 *
	 * @see {@link User} for available options
	 */
	user?: User;

	/**
	 * Forcefully set values like country, region, language for the consent
	 * manager.
	 * These values will override the values detected from the browser.
	 */
	overrides?: Overrides;

	/**
	 * Configuration for the network request blocker.
	 *
	 * @remarks
	 * The network blocker intercepts global `fetch` and `XMLHttpRequest`
	 * calls and blocks requests based on the current consent state and
	 * configured domain rules.
	 */
	networkBlocker?: NetworkBlockerConfig;

	/**
	 * Event callbacks for consent actions.
	 */
	callbacks: Callbacks;

	/**
	 * Translation configuration for the consent manager.
	 *
	 * @see {@link TranslationConfig} for available options
	 */
	translationConfig: TranslationConfig;

	/**
	 * Array of script configurations to manage.
	 */
	scripts: Script[];
}

/**
 * Metadata describing the consent manager instance.
 *
 * @public
 */
export interface StoreMetaConfig {
	/**
	 * Package name of the consent manager implementation.
	 */
	pkg: string;

	/**
	 * Version of the consent manager package.
	 */
	version: string;

	/**
	 * Current operating mode of the consent manager.
	 */
	mode: string;

	/**
	 * Optional metadata for custom integrations.
	 *
	 * @remarks
	 * This can be used for debugging, analytics or environment flags.
	 */
	meta?: Record<string, unknown>;
}

/**
 * Configuration options for the consent manager store.
 *
 * @remarks
 * These options control the behavior of the store,
 * including initialization, tracking blocker, and persistence.
 *
 * @public
 */
export interface StoreOptions extends Partial<StoreConfig> {
	/**
	 * Custom namespace for the store instance.
	 * @default 'c15tStore'
	 */
	namespace?: string;

	/**
	 * Whether c15t should be active.
	 *
	 * @remarks
	 * When set to `false`, c15t will not run the initialization process and
	 * all consents will be treated as granted on the client side.
	 * client side.
	 *
	 * This is useful when you want to temporarily disable consent handling
	 * (for example in certain environments) without removing the
	 * integration code.
	 *
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Initial GDPR consent types to activate.
	 *
	 * @see {@link AllConsentNames} for available options
	 */
	initialGdprTypes?: AllConsentNames[];

	/**
	 * Configuration for the iframe blocker.
	 * Controls how iframes are blocked based on consent settings.
	 *
	 * @see {@link IframeBlockerConfig} for available options
	 */
	iframeBlockerConfig?: IframeBlockerConfig;

	/**
	 * Initial Translation Config
	 *
	 * @see {@link TranslationConfig} for available options
	 */
	initialTranslationConfig?: Partial<TranslationConfig>;

	/**
	 * Translation configuration for the consent manager.
	 *
	 * @see {@link TranslationConfig} for available options
	 */
	translationConfig?: TranslationConfig;

	/**
	 * If showConsentBanner is fetched prior to the store being created, you can pass the initial data here.
	 *
	 * This is useful for server-side rendering (SSR) such as in @c15t/nextjs.
	 *
	 * @remarks
	 * The data can include both init data and optional GVL data when IAB mode is enabled.
	 * The GVL is fetched in parallel with init for better performance.
	 */
	_initialData?: Promise<SSRInitialData | undefined>;

	/**
	 * IAB TCF 2.3 configuration.
	 *
	 * Most users don't need this - only enable if you work with
	 * IAB-registered programmatic advertising vendors.
	 *
	 * @remarks
	 * When enabled, c15t will:
	 * - Fetch GVL from gvl.consent.io
	 * - Initialize __tcfapi CMP API
	 * - Generate TC Strings for IAB compliance
	 *
	 * This is an opt-in feature with zero bundle impact when not enabled.
	 *
	 * @see https://iabeurope.eu/transparency-consent-framework/
	 */
	iab?: IABConfig;

	/**
	 * Callbacks for the consent manager.
	 *
	 * @see {@link Callbacks} for available options
	 */
	callbacks?: Callbacks;

	/**
	 * Dynamically load scripts based on consent state.
	 * For scripts such as Google Tag Manager, Meta Pixel, etc.
	 *
	 * @see https://c15t.com/docs/frameworks/javascript/script-loader
	 * @see {@link Script} for available options
	 */
	scripts?: Script[];
}

/**
 * Runtime state fields for the consent management store.
 *
 * @remarks
 * These properties represent the dynamic state of the consent manager that
 * changes over time as users interact with consent dialogs and preferences.
 *
 * @public
 */
export interface StoreRuntimeState extends StoreConfig {
	/** Whether to show the branding */
	branding: Branding;

	/** Current consent states for all consent types */
	consents: ConsentState;

	/** Selected consents (Not Saved) - use saveConsents to save */
	selectedConsents: ConsentState;

	/** Information about when and how consent was given */
	consentInfo: ConsentInfo | null;

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

	/** Subject's location information */
	locationInfo: LocationInfo | null;

	/** Whether to include non-displayed consents in operations */
	includeNonDisplayedConsents: boolean;

	/** Available consent type configurations */
	consentTypes: ConsentType[];

	/** Configuration for the iframe blocker */
	iframeBlockerConfig: IframeBlockerConfig;

	/** Map of currently loaded script IDs to a boolean loaded-state */
	loadedScripts: Record<string, boolean>;

	/** Map of anonymized script IDs to their original IDs */
	scriptIdMap: Record<string, string>;

	/**
	 * What type of consent model to use for the consent manager.
	 *
	 * - 'opt-in' - Requires explicit consent before non-essential cookies or tracking. (GDPR Style)
	 * - 'opt-out' - Allows processing until the user exercises a right to opt out. (CCPA Style)
	 * - 'iab' - IAB TCF 2.3 mode for programmatic advertising compliance. (GDPR jurisdictions only)
	 */
	model: Model;

	// ─────────────────────────────────────────────────────────────────────────
	// IAB TCF State
	// ─────────────────────────────────────────────────────────────────────────

	/** IAB TCF configuration (null when not configured) */
	iabConfig: IABConfig | null;

	/** Global Vendor List data (null when not in IAB mode) */
	gvl: GlobalVendorList | null;

	/** Whether GVL is currently being fetched */
	isLoadingGVL: boolean;

	/** Non-IAB vendors configured by the publisher */
	nonIABVendors: NonIABVendor[];

	/** IAB TCF consent string (TC String) */
	tcString: string | null;

	/** Per-vendor consent state (keyed by vendor ID) */
	vendorConsents: Record<number, boolean>;

	/** Per-vendor legitimate interest state */
	vendorLegitimateInterests: Record<number, boolean>;

	/** Per-purpose consent state (IAB purposes 1-11) */
	purposeConsents: Record<number, boolean>;

	/** Per-purpose legitimate interest state */
	purposeLegitimateInterests: Record<number, boolean>;

	/** Special feature opt-ins (e.g., precise geolocation) */
	specialFeatureOptIns: Record<number, boolean>;

	/**
	 * Vendors disclosed to the user in the CMP UI (TCF 2.3 requirement).
	 *
	 * This tracks which vendors were shown to the user, regardless of
	 * whether consent was given. Required for TC String generation.
	 */
	vendorsDisclosed: Record<number, boolean>;

	/** CMP API controls (manages __tcfapi) */
	cmpApi: CMPApi | null;
}

/**
 * Runtime action methods for the consent management store.
 *
 * @remarks
 * These methods encapsulate all side-effectful operations that update the
 * store state or interact with external systems.
 *
 * @public
 */
export interface StoreActions {
	/**
	 * Updates the translation configuration.
	 *
	 * @param config - The new translation configuration
	 */
	setTranslationConfig: (config: TranslationConfig) => void;

	/**
	 * Sets the overrides for the consent manager.
	 *
	 * Automatically attempts to fetch the consent manager again with the new overrides.
	 *
	 * @param overrides - The overrides to set
	 * @returns A promise that resolves when the consent manager has been fetched again
	 */
	setOverrides: (
		overrides: StoreConfig['overrides']
	) => Promise<InitOutput | undefined>;

	/**
	 * Set the language override for the consent manager. This will override the language detected from the browser and re-fetch the consent banner information.
	 *
	 * @param language - The language code to override with (for example, "de" or "fr")
	 * @returns A promise that resolves when the consent manager has been fetched again
	 */
	setLanguage: (language: string) => Promise<InitOutput | undefined>;

	/**
	 * Identifies the user by setting the external ID.
	 *
	 * @remarks
	 * If the user has already consented, it will update the existing record.
	 *
	 * @param user - The user's information
	 * @returns A promise that resolves when the identification has completed
	 * @throws {Error} When the underlying identify-user request fails
	 */
	identifyUser: (user: User) => Promise<void>;

	/**
	 * Updates the selected consent state for a specific consent type.
	 *
	 * @param name - The consent type to update
	 * @param value - The new consent value
	 *
	 * @remarks
	 * This updates only the transient selection. To persist the change, call
	 * {@link saveConsents}.
	 */
	setSelectedConsent: (name: AllConsentNames, value: boolean) => void;

	/**
	 * Saves the user's consent preferences.
	 *
	 * @param type - The type of consent being saved
	 * @returns A promise that resolves when the preferences have been stored
	 * @throws {Error} When the underlying persistence layer fails
	 */
	saveConsents: (type: 'all' | 'custom' | 'necessary') => Promise<void>;

	/**
	 * Updates the consent state for a specific consent type & automatically save the consent.
	 *
	 * @param name - The consent type to update
	 * @param value - The new consent value
	 */
	setConsent: (name: AllConsentNames, value: boolean) => void;

	/** Resets all consent preferences to their default values */
	resetConsents: () => void;

	/**
	 * Controls the visibility of the consent popup.
	 *
	 * @param show - Whether to show the popup
	 * @param force - When true, forcefully updates the popup state regardless
	 * of current consent customization
	 */
	setShowPopup: (show: boolean, force?: boolean) => void;

	/**
	 * Controls the visibility of the privacy dialog.
	 *
	 * @param isOpen - Whether the dialog should be open
	 */
	setIsPrivacyDialogOpen: (isOpen: boolean) => void;

	/**
	 * Updates the active GDPR consent types.
	 *
	 * @param types - Array of consent types to activate
	 */
	setGdprTypes: (types: AllConsentNames[]) => void;

	/**
	 * Sets a callback for a specific consent event.
	 *
	 * @param name - The callback event name
	 * @param callback - The callback function
	 */
	setCallback: (
		name: keyof Callbacks,
		callback: Callbacks[keyof Callbacks] | undefined
	) => void;

	/**
	 * Updates the user's location information.
	 *
	 * @param location - The location information
	 */
	setLocationInfo: (location: LocationInfo | null) => void;

	/**
	 * Initializes the consent manager by fetching jurisdiction, location, translations, and branding information.
	 */
	initConsentManager: () => Promise<InitOutput | undefined>;

	/** Retrieves the list of consent types that should be displayed */
	getDisplayedConsents: () => typeof consentTypes;

	/** Checks if the user has provided any form of consent */
	hasConsented: () => boolean;

	/**
	 * Evaluates whether current consent state satisfies the given condition.
	 *
	 * @param condition - The consent condition to evaluate
	 * @returns True if the consent condition is satisfied, false otherwise
	 *
	 * @remarks
	 * This method provides a powerful way to check complex consent requirements
	 * using the current consent state from the store.
	 *
	 * **Simple Usage:**
	 * - Check single consent: `store.has("measurement")`
	 *
	 * **Complex Conditions:**
	 * - AND logic: `store.has({ and: ["measurement", "marketing"] })`
	 * - OR logic: `store.has({ or: ["measurement", "marketing"] })`
	 * - NOT logic: `store.has({ not: "measurement" })`
	 * - Nested logic: `store.has({ and: ["necessary", { or: ["measurement", "marketing"] }] })`
	 *
	 * @example
	 * ```typescript
	 * // Simple checks
	 * const hasAnalytics = store.has("measurement");
	 * const hasMarketing = store.has("marketing");
	 *
	 * // Complex logic
	 * const hasAnalyticsAndMarketing = store.has({ and: ["measurement", "marketing"] });
	 * const hasEitherAnalyticsOrMarketing = store.has({ or: ["measurement", "marketing"] });
	 * const doesNotHaveMarketing = store.has({ not: "marketing" });
	 *
	 * // Complex nested conditions
	 * const complexCondition = store.has({
	 *   and: [
	 *     "necessary",
	 *     { or: ["measurement", "marketing"] },
	 *     { not: "functionality" }
	 *   ]
	 * });
	 * ```
	 */
	has: <CategoryType extends AllConsentNames>(
		condition: HasCondition<CategoryType>
	) => boolean;

	/**
	 * Sets multiple script configurations to the store.
	 *
	 * @param scripts - Array of script configurations to add
	 */
	setScripts: (scripts: Script[]) => void;

	/**
	 * Removes a script configuration from the store.
	 *
	 * @param scriptId - ID of the script to remove
	 */
	removeScript: (scriptId: string) => void;

	/**
	 * Updates scripts based on current consent state.
	 * Loads scripts that have consent and aren't loaded yet.
	 * Unloads scripts that no longer have consent.
	 *
	 * @returns Object containing arrays of loaded and unloaded script IDs
	 */
	updateScripts: () => { loaded: string[]; unloaded: string[] };

	/**
	 * Checks if a script is currently loaded.
	 *
	 * @param scriptId - ID of the script to check
	 * @returns True if the script is loaded, false otherwise
	 */
	isScriptLoaded: (scriptId: string) => boolean;

	/**
	 * Gets all currently loaded script IDs.
	 *
	 * @returns Array of loaded script IDs
	 */
	getLoadedScriptIds: () => string[];

	/** Initializes the iframe blocker instance. */
	initializeIframeBlocker: () => void;

	/** Updates the active consents used by the iframe blocker. */
	updateIframeConsents: () => void;

	/** Destroys the iframe blocker instance and cleans up resources. */
	destroyIframeBlocker: () => void;

	/** Initializes the network blocker instance. */
	initializeNetworkBlocker: () => void;

	/** Updates the consent snapshot used by the network blocker. */
	updateNetworkBlockerConsents: () => void;

	/** Updates the network blocker configuration at runtime. */
	setNetworkBlocker: (config: StoreConfig['networkBlocker']) => void;

	/** Destroys the network blocker instance and cleans up resources. */
	destroyNetworkBlocker: () => void;

	/**
	 * Extends the active GDPR consent categories with any categories used by
	 * configured scripts.
	 *
	 * @param newCategories - New consent categories detected from scripts
	 */
	updateConsentCategories: (newCategories: AllConsentNames[]) => void;

	// ─────────────────────────────────────────────────────────────────────────
	// IAB TCF Actions
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Sets IAB purpose consent.
	 *
	 * @param purposeId - IAB purpose ID (1-11)
	 * @param value - Whether consent is granted
	 */
	setPurposeConsent: (purposeId: number, value: boolean) => void;

	/**
	 * Sets IAB purpose legitimate interest.
	 *
	 * @param purposeId - IAB purpose ID (1-11)
	 * @param value - Whether legitimate interest is established
	 */
	setPurposeLegitimateInterest: (purposeId: number, value: boolean) => void;

	/**
	 * Sets IAB vendor consent.
	 *
	 * @param vendorId - IAB vendor ID
	 * @param value - Whether consent is granted
	 */
	setVendorConsent: (vendorId: number, value: boolean) => void;

	/**
	 * Sets IAB vendor legitimate interest.
	 *
	 * @param vendorId - IAB vendor ID
	 * @param value - Whether legitimate interest is established
	 */
	setVendorLegitimateInterest: (vendorId: number, value: boolean) => void;

	/**
	 * Sets special feature opt-in.
	 *
	 * @param featureId - IAB special feature ID (1-2)
	 * @param value - Whether opt-in is granted
	 */
	setSpecialFeatureOptIn: (featureId: number, value: boolean) => void;

	/**
	 * Accepts all IAB purposes, vendors, and special features.
	 */
	acceptAllIAB: () => void;

	/**
	 * Rejects all IAB purposes (except necessary/Purpose 1) and vendors.
	 */
	rejectAllIAB: () => void;

	/**
	 * Saves IAB consents and generates TC String.
	 *
	 * @returns Promise that resolves when consents are saved
	 */
	saveIABConsents: () => Promise<void>;
}

/**
 * Core state and methods interface for the consent management store.
 *
 * @remarks
 * This type combines the runtime state slice {@link StoreRuntimeState} and the
 * action slice {@link StoreActions} into a single interface that represents
 * the full store surface.
 *
 * The store is typically created using {@link createConsentManagerStore} and
 * accessed through React hooks or direct store subscription.
 *
 * @example
 * Basic store usage:
 * ```typescript
 * const store = createConsentManagerStore();
 *
 * // Check consent status using a HasCondition<CategoryType> value (e.g. "measurement"),
 * // not an arbitrary free-form string
 * if (store.getState().has('measurement')) {
 *   initializeAnalytics();
 * }
 *
 * // Update consent preferences
 * store.getState().saveConsents('all');
 * ```
 *
 * @public
 */
export type ConsentStoreState = StoreRuntimeState & StoreActions;
