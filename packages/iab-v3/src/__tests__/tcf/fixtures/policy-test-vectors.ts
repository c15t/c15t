/**
 * Policy Test Vectors for IAB TCF 2.3 Compliance Testing
 *
 * Contains predefined consent states for testing various IAB TCF scenarios.
 *
 * @packageDocumentation
 */

import type { TCFConsentData } from '../../../tcf/iab-tcf-types';

/**
 * Consent state: All rejected (only Purpose 1 accepted)
 * Represents "Reject All" user action
 */
export const CONSENT_ALL_REJECTED: TCFConsentData = {
	purposeConsents: {
		1: true, // Purpose 1 is strictly necessary
		2: false,
		3: false,
		4: false,
		5: false,
		6: false,
		7: false,
		8: false,
		9: false,
		10: false,
		11: false,
	},
	purposeLegitimateInterests: {
		2: false,
		3: false,
		4: false,
		5: false,
		6: false,
		7: false,
		8: false,
		9: false,
		10: false,
		11: false,
	},
	vendorConsents: {},
	vendorLegitimateInterests: {},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorsDisclosed: {},
};

/**
 * Consent state: All accepted
 * Represents "Accept All" user action
 */
export const CONSENT_ALL_ACCEPTED: TCFConsentData = {
	purposeConsents: {
		1: true,
		2: true,
		3: true,
		4: true,
		5: true,
		6: true,
		7: true,
		8: true,
		9: true,
		10: true,
		11: true,
	},
	purposeLegitimateInterests: {
		2: true,
		3: true,
		4: true,
		5: true,
		6: true,
		7: true,
		8: true,
		9: true,
		10: true,
		11: true,
	},
	vendorConsents: {
		1: true,
		2: true,
		10: true,
		755: true,
	},
	vendorLegitimateInterests: {
		1: true,
		2: true,
		10: true,
		755: true,
	},
	specialFeatureOptIns: {
		1: true,
		2: true,
	},
	vendorsDisclosed: {
		1: true,
		2: true,
		10: true,
		755: true,
	},
};

/**
 * Consent state: Marketing only
 * User consented to advertising purposes only
 */
export const CONSENT_MARKETING_ONLY: TCFConsentData = {
	purposeConsents: {
		1: true,
		2: true, // Basic ads
		3: true, // Ad profiles
		4: true, // Personalized ads
		5: false,
		6: false,
		7: false,
		8: false,
		9: false,
		10: false,
		11: false,
	},
	purposeLegitimateInterests: {
		2: true,
		3: true,
		4: true,
	},
	vendorConsents: {
		1: true,
		755: true,
	},
	vendorLegitimateInterests: {
		1: true,
		755: true,
	},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorsDisclosed: {
		1: true,
		755: true,
	},
};

/**
 * Consent state: Measurement only
 * User consented to measurement/analytics purposes only
 */
export const CONSENT_MEASUREMENT_ONLY: TCFConsentData = {
	purposeConsents: {
		1: true,
		2: false,
		3: false,
		4: false,
		5: false,
		6: false,
		7: true, // Ad measurement
		8: true, // Content measurement
		9: true, // Audience insights
		10: false,
		11: false,
	},
	purposeLegitimateInterests: {
		7: true,
		8: true,
		9: true,
	},
	vendorConsents: {
		10: true,
	},
	vendorLegitimateInterests: {
		10: true,
	},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorsDisclosed: {
		10: true,
	},
};

/**
 * Consent state: LI objections
 * User objected to specific LI purposes
 */
export const CONSENT_LI_OBJECTIONS: TCFConsentData = {
	purposeConsents: {
		1: true,
		2: true,
		7: true,
	},
	purposeLegitimateInterests: {
		2: true,
		7: false, // Objected
		9: false, // Objected
		10: true,
	},
	vendorConsents: {
		1: true,
		10: true,
	},
	vendorLegitimateInterests: {
		1: true,
		10: false, // Objected
	},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorsDisclosed: {
		1: true,
		10: true,
	},
};

/**
 * Consent state: Special features only
 * User opted in to special features but minimal purposes
 */
export const CONSENT_SPECIAL_FEATURES: TCFConsentData = {
	purposeConsents: {
		1: true,
	},
	purposeLegitimateInterests: {},
	vendorConsents: {
		1: true,
	},
	vendorLegitimateInterests: {},
	specialFeatureOptIns: {
		1: true, // Precise geolocation
		2: true, // Device scanning
	},
	vendorsDisclosed: {
		1: true,
	},
};

/**
 * Consent state: Granular selection
 * User made specific, granular choices
 */
export const CONSENT_GRANULAR: TCFConsentData = {
	purposeConsents: {
		1: true,
		2: true,
		3: false,
		4: false,
		5: true,
		6: true,
		7: true,
		8: false,
		9: false,
		10: true,
		11: true,
	},
	purposeLegitimateInterests: {
		2: true,
		5: true,
		6: true,
		7: false,
		10: true,
		11: true,
	},
	vendorConsents: {
		1: true,
		2: false,
		10: true,
		755: true,
	},
	vendorLegitimateInterests: {
		1: true,
		2: false,
		10: false,
		755: true,
	},
	specialFeatureOptIns: {
		1: true,
		2: false,
	},
	vendorsDisclosed: {
		1: true,
		2: true,
		10: true,
		755: true,
	},
};

/**
 * Consent state: Empty (initial state before user action)
 */
export const CONSENT_EMPTY: TCFConsentData = {
	purposeConsents: {},
	purposeLegitimateInterests: {},
	vendorConsents: {},
	vendorLegitimateInterests: {},
	specialFeatureOptIns: {},
	vendorsDisclosed: {},
};

/**
 * Consent state: Single vendor
 * Only one vendor selected
 */
export const CONSENT_SINGLE_VENDOR: TCFConsentData = {
	purposeConsents: {
		1: true,
		2: true,
		7: true,
	},
	purposeLegitimateInterests: {
		9: true,
		10: true,
	},
	vendorConsents: {
		755: true, // Only Google
	},
	vendorLegitimateInterests: {
		755: true,
	},
	specialFeatureOptIns: {
		1: true,
	},
	vendorsDisclosed: {
		755: true,
	},
};
