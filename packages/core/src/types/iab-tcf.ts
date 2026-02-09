/**
 * IAB TCF 2.3 Types
 *
 * Type definitions for the Global Vendor List (GVL) and related IAB TCF structures.
 * Based on IAB TCF v2.3 specification.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 * @packageDocumentation
 */

// GVL types are defined in @c15t/schema — re-export for internal consumers
export type {
	GlobalVendorList,
	GVLDataCategory,
	GVLFeature,
	GVLPurpose,
	GVLSpecialFeature,
	GVLSpecialPurpose,
	GVLStack,
	GVLVendor,
	GVLVendorUrl,
} from '@c15t/schema/types';

import type { GlobalVendorList } from '@c15t/schema/types';

/**
 * TCF consent data structure for generating TC Strings.
 *
 * @public
 */
export interface TCFConsentData {
	/** Per-purpose consent state (keyed by purpose ID 1-11) */
	purposeConsents: Record<number, boolean>;

	/** Per-purpose legitimate interest state */
	purposeLegitimateInterests: Record<number, boolean>;

	/** Per-vendor consent state (keyed by vendor ID) */
	vendorConsents: Record<string, boolean>;

	/** Per-vendor legitimate interest state */
	vendorLegitimateInterests: Record<string, boolean>;

	/** Special feature opt-ins (keyed by special feature ID 1-2) */
	specialFeatureOptIns: Record<number, boolean>;

	/**
	 * Vendors disclosed to the user in the CMP UI (keyed by vendor ID).
	 *
	 * Required for IAB TCF 2.3 compliance. Each vendor shown in the UI should
	 * have their ID set to true, regardless of whether consent was given.
	 */
	vendorsDisclosed: Record<number, boolean>;

	/** Publisher restrictions (optional) */
	publisherRestrictions?: PublisherRestriction[];
}

/**
 * Publisher restriction for a specific purpose.
 *
 * @public
 */
export interface PublisherRestriction {
	/** Purpose ID this restriction applies to */
	purposeId: number;

	/**
	 * Restriction type:
	 * - 0: Purpose flatly not allowed
	 * - 1: Require consent (cannot use legitimate interest)
	 * - 2: Require legitimate interest (cannot use consent)
	 */
	restrictionType: 0 | 1 | 2;

	/** Vendor IDs this restriction applies to */
	vendorIds: number[];
}

/**
 * CMP status values per IAB TCF spec.
 *
 * @public
 */
export type CMPStatus = 'stub' | 'loading' | 'loaded' | 'error';

/**
 * Display status values for the CMP UI.
 *
 * @public
 */
export type DisplayStatus = 'visible' | 'hidden' | 'disabled';

/**
 * Event status values for TCF event callbacks.
 *
 * @public
 */
export type EventStatus =
	| 'tcloaded'
	| 'cmpuishown'
	| 'useractioncomplete'
	| 'visible';

/**
 * Ping data returned by __tcfapi 'ping' command.
 *
 * @public
 */
export interface PingData {
	/** True if using a registered CMP */
	gdprApplies: boolean | undefined;

	/** CMP loading status */
	cmpLoaded: boolean;

	/** CMP status string */
	cmpStatus: CMPStatus;

	/** Display status of CMP UI */
	displayStatus: DisplayStatus;

	/** TCF API version */
	apiVersion: string;

	/** CMP version */
	cmpVersion: string;

	/** CMP ID registered with IAB */
	cmpId: number;

	/** GVL version loaded */
	gvlVersion: number;

	/** TCF policy version */
	tcfPolicyVersion: number;
}

/**
 * TC Data returned by __tcfapi 'getTCData' command.
 *
 * @public
 */
export interface TCData {
	/** TC String */
	tcString: string;

	/** TCF policy version (e.g., 2 for TCF 2.0, 4 for TCF 2.2) */
	tcfPolicyVersion?: number;

	/** CMP ID registered with IAB */
	cmpId?: number;

	/** CMP version */
	cmpVersion?: number;

	/** Whether GDPR applies */
	gdprApplies: boolean;

	/** Listener ID if from addEventListener */
	listenerId?: number;

	/** Event status */
	eventStatus?: EventStatus;

	/** CMP status */
	cmpStatus: CMPStatus;

	/** Whether service-specific (not global) */
	isServiceSpecific: boolean;

	/** Whether publisher consent or legitimate interest was established */
	useNonStandardTexts: boolean;

	/** Publisher country code */
	publisherCC: string;

	/** Purpose one treatment (0 = no special treatment, 1 = consent not given) */
	purposeOneTreatment: boolean;

	/** Purpose consents */
	purpose: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
	};

	/** Vendor consents */
	vendor: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
	};

	/** Special feature opt-ins */
	specialFeatureOptins: Record<number, boolean>;

	/** Publisher data */
	publisher: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
		customPurpose: {
			consents: Record<number, boolean>;
			legitimateInterests: Record<number, boolean>;
		};
		restrictions: Record<number, Record<number, number>>;
	};
}

/**
 * Callback function type for __tcfapi.
 *
 * @public
 */
export type TCFApiCallback<T = TCData | PingData | GlobalVendorList | boolean> =
	(data: T | null, success: boolean) => void;

/**
 * __tcfapi function signature.
 *
 * @public
 */
export interface TCFApi {
	(command: 'ping', version: number, callback: TCFApiCallback<PingData>): void;
	(
		command: 'getTCData',
		version: number,
		callback: TCFApiCallback<TCData>,
		vendorIds?: number[]
	): void;
	(
		command: 'getInAppTCData',
		version: number,
		callback: TCFApiCallback<TCData>
	): void;
	(
		command: 'getVendorList',
		version: number,
		callback: TCFApiCallback<GlobalVendorList>,
		vendorListVersion?: number
	): void;
	(
		command: 'addEventListener',
		version: number,
		callback: TCFApiCallback<TCData>
	): void;
	(
		command: 'removeEventListener',
		version: number,
		callback: TCFApiCallback<boolean>,
		listenerId: number
	): void;
	/** Queue for stub to store calls before CMP loads */
	queue?: Array<Parameters<TCFApi>>;
}
declare global {
	interface Window {
		__tcfapi?: TCFApi;
	}
}

/**
 * IAB TCF Purpose IDs.
 *
 * @public
 */
export const IAB_PURPOSES = {
	/** Store and/or access information on a device */
	STORE_ACCESS_INFO: 1,
	/** Use limited data to select advertising */
	SELECT_BASIC_ADS: 2,
	/** Create profiles for personalised advertising */
	CREATE_AD_PROFILE: 3,
	/** Use profiles to select personalised advertising */
	SELECT_PERSONALISED_ADS: 4,
	/** Create profiles to personalise content */
	CREATE_CONTENT_PROFILE: 5,
	/** Use profiles to select personalised content */
	SELECT_PERSONALISED_CONTENT: 6,
	/** Measure advertising performance */
	MEASURE_AD_PERFORMANCE: 7,
	/** Measure content performance */
	MEASURE_CONTENT_PERFORMANCE: 8,
	/** Understand audiences through statistics or combinations of data */
	MARKET_RESEARCH: 9,
	/** Develop and improve services */
	PRODUCT_DEVELOPMENT: 10,
	/** Use limited data to select content */
	SELECT_BASIC_CONTENT: 11,
} as const;

/**
 * IAB TCF Special Feature IDs.
 *
 * @public
 */
export const IAB_SPECIAL_FEATURES = {
	/** Use precise geolocation data */
	PRECISE_GEOLOCATION: 1,
	/** Actively scan device characteristics for identification */
	DEVICE_SCANNING: 2,
} as const;

/**
 * IAB TCF Feature IDs.
 *
 * @public
 */
export const IAB_FEATURES = {
	/** Match and combine data from other data sources */
	MATCH_COMBINE_DATA: 1,
	/** Link different devices */
	LINK_DEVICES: 2,
	/** Identify devices based on information transmitted automatically */
	IDENTIFY_DEVICES: 3,
} as const;

/**
 * IAB TCF Data Category IDs.
 *
 * @public
 */
export const IAB_DATA_CATEGORIES = {
	/** IP addresses */
	IP_ADDRESSES: 1,
	/** Device characteristics */
	DEVICE_CHARACTERISTICS: 2,
	/** Device identifiers */
	DEVICE_IDENTIFIERS: 3,
	/** Probabilistic identifiers */
	PROBABILISTIC_IDENTIFIERS: 4,
	/** Authentication-derived identifiers */
	AUTH_IDENTIFIERS: 5,
	/** Browsing and interaction data */
	BROWSING_DATA: 6,
	/** User-provided data */
	USER_PROVIDED_DATA: 7,
	/** Non-precise location data */
	NON_PRECISE_LOCATION: 8,
	/** Precise location data */
	PRECISE_LOCATION: 9,
	/** Users' profiles */
	USER_PROFILES: 10,
	/** Privacy choices */
	PRIVACY_CHOICES: 11,
} as const;
