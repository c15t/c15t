/**
 * Internal TCF types used by the tcf module.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList, TCFConsentData } from '../../types/iab-tcf';
import type { NonIABVendor } from '../../types/non-iab-vendor';

// ─────────────────────────────────────────────────────────────────────────────
// IAB Store State & Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IAB TCF 2.3 runtime state.
 *
 * @remarks
 * This interface encapsulates all IAB-specific state, including the Global Vendor List,
 * consent strings, and per-vendor/purpose consent states.
 *
 * @public
 */
export interface IABState {
	/** IAB TCF configuration */
	config: IABConfig;

	/** Global Vendor List data (null when not yet fetched or in non-IAB region) */
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
 * IAB TCF action methods.
 *
 * @remarks
 * These methods manage IAB consent state and are accessed via `store.iab?.methodName()`.
 *
 * @public
 */
export interface IABActions {
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
	acceptAll: () => void;

	/**
	 * Rejects all IAB purposes (except necessary/Purpose 1) and vendors.
	 */
	rejectAll: () => void;

	/**
	 * Saves IAB consents and generates TC String.
	 *
	 * @returns Promise that resolves when consents are saved
	 */
	save: () => Promise<void>;

	/**
	 * Updates IAB state (internal use).
	 *
	 * @param updates - Partial IAB state to merge
	 * @internal
	 */
	_updateState: (updates: Partial<IABState>) => void;
}

/**
 * Combined IAB state and actions.
 *
 * @remarks
 * This is the type of `store.iab` when IAB mode is enabled.
 * When IAB is not configured, `store.iab` is `null`.
 *
 * @public
 */
export type IABManager = IABState & IABActions;

// ─────────────────────────────────────────────────────────────────────────────
// CMP API Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for creating a CMP API instance.
 *
 * @internal
 */
export interface CMPApiConfig {
	/** CMP ID registered with IAB */
	cmpId: number;

	/** CMP version */
	cmpVersion?: number;

	/** Global Vendor List data */
	gvl: GlobalVendorList;

	/** Whether GDPR applies */
	gdprApplies?: boolean;
}

/**
 * CMP API control interface returned by createCMPApi.
 *
 * @public
 */
export interface CMPApi {
	/**
	 * Updates the consent state with a new TC String.
	 *
	 * @param tcString - The new TC String
	 * @param consentData - The consent data used to generate the string
	 */
	updateConsent: (tcString: string, consentData?: TCFConsentData) => void;

	/**
	 * Sets the display status of the CMP UI.
	 *
	 * @param status - The new display status
	 */
	setDisplayStatus: (status: 'visible' | 'hidden' | 'disabled') => void;

	/**
	 * Loads consent from storage (cookie/localStorage).
	 *
	 * @returns The loaded TC String, or null if none found
	 */
	loadFromStorage: () => string | null;

	/**
	 * Saves the current TC String to storage.
	 *
	 * @param tcString - The TC String to save
	 */
	saveToStorage: (tcString: string) => void;

	/**
	 * Gets the current TC String.
	 */
	getTcString: () => string;

	/**
	 * Destroys the CMP API instance and cleans up.
	 */
	destroy: () => void;
}

/**
 * IAB configuration for the consent manager store.
 *
 * @public
 */
export interface IABConfig {
	/**
	 * Enable IAB TCF 2.3 mode.
	 *
	 * When enabled, c15t will:
	 * - Fetch GVL from gvl.consent.io
	 * - Initialize __tcfapi CMP API
	 * - Generate TC Strings for IAB compliance
	 *
	 * Note: Only works in 'c15t' client mode (requires backend)
	 */
	enabled: boolean;

	/**
	 * Your registered CMP ID with IAB Europe.
	 *
	 * **IMPORTANT: Production Requirement**
	 *
	 * For production IAB TCF 2.3 compliance, you MUST register your CMP with
	 * IAB Europe and use your assigned CMP ID. Using an unregistered or
	 * placeholder ID violates TCF policies and may result in your TC Strings
	 * being rejected by vendors.
	 *
	 * Registration steps:
	 * 1. Apply at https://iabeurope.eu/tcf-for-cmps/
	 * 2. Complete the registration and validation process
	 * 3. Use your assigned CMP ID here
	 *
	 * @see https://iabeurope.eu/cmp-list/ - List of registered CMPs
	 * @see https://iabeurope.eu/tcf-for-cmps/ - CMP registration information
	 */
	cmpId: number;

	/**
	 * CMP version (optional).
	 * @default 1
	 */
	cmpVersion?: number;

	/**
	 * IAB-registered vendors to include.
	 *
	 * Map of vendor ID to a readable name (for self-documentation).
	 * The names are used for code readability and debug logging.
	 *
	 * @example
	 * ```typescript
	 * vendors: {
	 *   1: 'exponential-interactive',
	 *   2: 'captify',
	 *   10: 'index-exchange',
	 *   755: 'google-advertising',
	 * }
	 * ```
	 */
	vendors: Record<number, string>;

	/**
	 * Custom vendors not registered with IAB.
	 *
	 * These are displayed separately in the consent UI with a note
	 * that they have different privacy practices than IAB vendors.
	 */
	customVendors?: NonIABVendor[];

	/**
	 * Publisher country code (2-letter ISO).
	 * @default 'US'
	 */
	publisherCountryCode?: string;

	/**
	 * Whether consent is service-specific (not global).
	 * @default true
	 */
	isServiceSpecific?: boolean;
}

/**
 * Result of GVL fetch operation.
 *
 * @internal
 */
export interface FetchGVLResult {
	/** The fetched GVL */
	gvl: GlobalVendorList;

	/** Whether this was served from cache */
	fromCache: boolean;
}

/**
 * Storage keys for IAB TCF data.
 *
 * @internal
 */
export const IAB_STORAGE_KEYS = {
	/** TC String cookie name (per TCF spec) */
	TC_STRING_COOKIE: 'euconsent-v2',

	/** TC String localStorage key */
	TC_STRING_LOCAL: 'c15t_tc_string',

	/** GVL cache localStorage key */
	GVL_CACHE: 'c15t_gvl_cache',

	/** Consent timestamp */
	CONSENT_TIMESTAMP: 'c15t_consent_timestamp',
} as const;

/**
 * Default GVL endpoint.
 *
 * @internal
 */
export const GVL_ENDPOINT = 'https://gvl.consent.io';
