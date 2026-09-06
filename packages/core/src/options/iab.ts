import type { GlobalVendorList, NonIABVendor } from '../types';
import type { TCFConsentData } from './iab-tcf';

/**
 * Configuration for the IAB TCF 2.3 integration.
 */
export interface IABConfig {
	/** Enables IAB TCF mode. */
	enabled: boolean;
	/** CMP ID registered with the IAB. */
	cmpId?: number;
	/** CMP version reported through `__tcfapi`. */
	cmpVersion?: number | string;
	/** Restricts the vendor list to these vendor IDs. */
	vendors?: number[];
	/** Additional vendors outside the Global Vendor List. */
	customVendors?: NonIABVendor[];
	/** Publisher country code used in the TC string. */
	publisherCountryCode?: string;
	/** Whether consent is service-specific rather than global. */
	isServiceSpecific?: boolean;
	/** Pre-fetched Global Vendor List. */
	gvl?: GlobalVendorList;
}

/**
 * Options for creating a `__tcfapi` CMP implementation.
 */
export interface CMPApiConfig {
	cmpId?: number;
	cmpVersion?: number | string;
	gvl: GlobalVendorList;
	gdprApplies?: boolean;
}

/**
 * Handle returned by the CMP API factory.
 */
export interface CMPApi {
	updateConsent: (tcString: string, consentData?: TCFConsentData) => void;
	setDisplayStatus: (status: 'visible' | 'hidden' | 'disabled') => void;
	loadFromStorage: () => string | null;
	saveToStorage: (tcString: string) => void;
	getTcString: () => string;
	destroy: () => void;
}

/**
 * Result of fetching the Global Vendor List.
 */
export interface FetchGVLResult {
	gvl: GlobalVendorList;
	fromCache: boolean;
}
