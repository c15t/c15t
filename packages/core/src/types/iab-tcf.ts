/**
 * IAB TCF 2.3 Types
 *
 * Type definitions for the Global Vendor List (GVL) and related IAB TCF structures.
 * Based on IAB TCF v2.3 specification.
 *
 * @see https://github.com/InteractiveAdvertisingBureau/GDPR-Transparency-and-Consent-Framework
 * @packageDocumentation
 */

// ─────────────────────────────────────────────────────────────────────────────
// Purpose Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IAB TCF Purpose definition from the GVL.
 *
 * Purposes describe the reasons for data processing (e.g., advertising, analytics).
 * IAB TCF 2.3 defines 11 purposes.
 *
 * @public
 */
export interface GVLPurpose {
	/** Purpose ID (1-11) */
	id: number;

	/** Display name of the purpose */
	name: string;

	/** Full description of the purpose */
	description: string;

	/** Simplified descriptions for user display */
	illustrations: string[];

	/** Whether this purpose supports legitimate interest */
	descriptionLegal?: string;
}

/**
 * IAB TCF Special Purpose definition.
 *
 * Special purposes are required for basic functionality and cannot be disabled.
 * IAB TCF 2.3 defines 2 special purposes.
 *
 * @public
 */
export interface GVLSpecialPurpose {
	/** Special purpose ID (1-2) */
	id: number;

	/** Display name */
	name: string;

	/** Full description */
	description: string;

	/** Simplified descriptions for user display */
	illustrations: string[];

	/** Legal description */
	descriptionLegal?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IAB TCF Feature definition.
 *
 * Features describe technical capabilities vendors may use (e.g., device linking).
 * IAB TCF 2.3 defines 3 features.
 *
 * @public
 */
export interface GVLFeature {
	/** Feature ID (1-3) */
	id: number;

	/** Display name */
	name: string;

	/** Full description */
	description: string;

	/** Simplified descriptions for user display */
	illustrations: string[];

	/** Legal description */
	descriptionLegal?: string;
}

/**
 * IAB TCF Special Feature definition.
 *
 * Special features require explicit opt-in (e.g., precise geolocation).
 * IAB TCF 2.3 defines 2 special features.
 *
 * @public
 */
export interface GVLSpecialFeature {
	/** Special feature ID (1-2) */
	id: number;

	/** Display name */
	name: string;

	/** Full description */
	description: string;

	/** Simplified descriptions for user display */
	illustrations: string[];

	/** Legal description */
	descriptionLegal?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vendor URL entry for privacy policy and other legal pages.
 *
 * @public
 */
export interface GVLVendorUrl {
	/** Language code (e.g., 'en', 'de') */
	langId: string;

	/** Privacy policy URL */
	privacy?: string;

	/** Legitimate interest disclosure URL */
	legIntClaim?: string;
}

/**
 * IAB TCF Vendor definition from the GVL.
 *
 * Contains all information about a vendor's data processing practices.
 *
 * @public
 */
export interface GVLVendor {
	/** Vendor ID */
	id: number;

	/** Vendor name */
	name: string;

	/** Purpose IDs requiring consent */
	purposes: number[];

	/** Purpose IDs claimed under legitimate interest */
	legIntPurposes: number[];

	/**
	 * Flexible purposes that can be either consent or legitimate interest.
	 * Vendors can change their legal basis for these purposes.
	 */
	flexiblePurposes: number[];

	/** Special purpose IDs (required, cannot be disabled) */
	specialPurposes: number[];

	/** Feature IDs used by this vendor */
	features: number[];

	/** Special feature IDs requiring explicit opt-in */
	specialFeatures: number[];

	/** Maximum cookie storage duration in seconds */
	cookieMaxAgeSeconds: number | null;

	/** Whether the vendor uses cookies */
	usesCookies: boolean;

	/** Whether the vendor refreshes cookies */
	cookieRefresh: boolean;

	/** Whether the vendor uses non-cookie storage (localStorage, etc.) */
	usesNonCookieAccess: boolean;

	/** Legal URLs by language */
	urls: GVLVendorUrl[];

	/** Device storage disclosure ID (if applicable) */
	deviceStorageDisclosureUrl?: string;

	/** Data categories collected (1-11) */
	dataCategories?: number[];

	/** Data retention period in days */
	dataRetention?: {
		/** Purpose-specific retention periods */
		purposes?: Record<number, number>;
		/** Special purpose-specific retention periods */
		specialPurposes?: Record<number, number>;
		/** Standard retention period */
		stdRetention?: number;
	};

	/** Whether vendor has been deleted/deprecated */
	deletedDate?: string;

	/** Overflow encoding options */
	overflow?: {
		httpGetLimit: number;
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Stack Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IAB TCF Stack definition.
 *
 * Stacks group related purposes for simplified user display.
 *
 * @public
 */
export interface GVLStack {
	/** Stack ID */
	id: number;

	/** Display name */
	name: string;

	/** Full description */
	description: string;

	/** Purpose IDs included in this stack */
	purposes: number[];

	/** Special feature IDs included in this stack */
	specialFeatures: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Category Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IAB TCF Data Category definition.
 *
 * Data categories describe types of data collected/processed.
 * IAB TCF 2.3 defines 11 data categories.
 *
 * @public
 */
export interface GVLDataCategory {
	/** Data category ID (1-11) */
	id: number;

	/** Display name */
	name: string;

	/** Full description */
	description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global Vendor List
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete Global Vendor List structure.
 *
 * This is the full GVL as returned from the IAB TCF vendor list endpoint.
 *
 * @public
 */
export interface GlobalVendorList {
	/** GVL specification version */
	gvlSpecificationVersion: number;

	/** Vendor list version number */
	vendorListVersion: number;

	/** TCF policy version this GVL adheres to */
	tcfPolicyVersion: number;

	/** Last update timestamp (ISO 8601) */
	lastUpdated: string;

	/** All purposes (keyed by ID) */
	purposes: Record<number, GVLPurpose>;

	/** Special purposes (keyed by ID) */
	specialPurposes: Record<number, GVLSpecialPurpose>;

	/** Features (keyed by ID) */
	features: Record<number, GVLFeature>;

	/** Special features (keyed by ID) */
	specialFeatures: Record<number, GVLSpecialFeature>;

	/** Vendors (keyed by ID) */
	vendors: Record<number, GVLVendor>;

	/** Stacks for simplified display (keyed by ID) */
	stacks: Record<number, GVLStack>;

	/** Data categories (keyed by ID) */
	dataCategories?: Record<number, GVLDataCategory>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TCF Consent State Types
// ─────────────────────────────────────────────────────────────────────────────

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
	vendorConsents: Record<number, boolean>;

	/** Per-vendor legitimate interest state */
	vendorLegitimateInterests: Record<number, boolean>;

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

// ─────────────────────────────────────────────────────────────────────────────
// CMP API Types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Global Window Extension
// ─────────────────────────────────────────────────────────────────────────────

declare global {
	interface Window {
		__tcfapi?: TCFApi;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// IAB Purpose ID Constants
// ─────────────────────────────────────────────────────────────────────────────

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
