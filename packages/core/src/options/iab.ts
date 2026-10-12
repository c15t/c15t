import type { GlobalVendorList, NonIABVendor } from '../types';
import type { PublisherRestriction, TCFConsentData } from './iab-tcf';

/**
 * Google Additional Consent (ACv2) configuration.
 *
 * Lists Google ad tech providers that are not on the IAB Global Vendor
 * List. The preference center shows each one with its privacy policy, and
 * the CMP publishes an AC string (`addtlConsent`) beside the TC string.
 */
export interface AdditionalConsentConfig {
	/**
	 * Google ATP IDs from Google's Additional Consent provider list
	 * (`additional-consent-providers.csv`). IDs Google does not list are
	 * ignored.
	 */
	providers: number[];
	/**
	 * Provider list endpoint. Receives `?providerIds=1,2,3` and returns
	 * `{ providers: { [id]: { id, name, policyUrl } } }`.
	 * Default: `https://gvl.inth.app/additional-consent`.
	 */
	url?: string;
}

/**
 * Configuration for the IAB TCF 2.4 integration.
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
	/** Google ad tech providers for the Additional Consent string. */
	additionalConsent?: AdditionalConsentConfig;
	/** Publisher country code used in the TC string. */
	publisherCountryCode?: string;
	/**
	 * Ignored: c15t always encodes IsServiceSpecific=1.
	 *
	 * @deprecated TCF requires IsServiceSpecific=1. Group-specific scope is
	 * also encoded as 1. Passing `false` logs a warning once and has no
	 * other effect.
	 */
	isServiceSpecific?: boolean;
	/**
	 * Publisher restrictions to encode into the TC string and apply to IAB
	 * gates. `@c15t/iab` rejects
	 * restrictions that do not match the vendor list's declarations.
	 */
	publisherRestrictions?: PublisherRestriction[];
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
	/**
	 * Returns the Additional Consent string confirmed with a TC string, or
	 * `undefined` when there is none. Read whenever a TC string is
	 * published or saved, so `addtlConsent` always travels with its TC string.
	 */
	getAddtlConsent?: (tcString: string) => string | undefined;
}

/**
 * Handle returned by the CMP API factory.
 */
export interface CMPApi {
	/**
	 * Update public vendor metadata while retaining registered TCF listeners.
	 * Publish confirmed data with updateConsent after replacing the list.
	 * @param gvl - The new list, or null to mark a replacement as loading.
	 * @returns Nothing.
	 */
	updateVendorList: (gvl: GlobalVendorList | null) => void;
	/** Update the confirmed TC data and, when supplied, regional applicability. */
	updateConsent: (
		tcString: string,
		consentData?: TCFConsentData,
		gdprApplies?: boolean
	) => void;
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
