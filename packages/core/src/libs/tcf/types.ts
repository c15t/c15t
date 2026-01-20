/**
 * Internal TCF types used by the tcf module.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList, TCFConsentData } from '../../types/iab-tcf';
import type { NonIABVendor } from '../../types/non-iab-vendor';

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
	 * Your registered CMP ID with IAB.
	 *
	 * Required for production IAB compliance.
	 * @see https://iabeurope.eu/cmp-list/
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
