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
		// Purpose 1 is strictly necessary
		1: true,
		10: false,
		11: false,
		2: false,
		3: false,
		4: false,
		5: false,
		6: false,
		7: false,
		8: false,
		9: false,
	},
	purposeLegitimateInterests: {
		10: false,
		11: false,
		2: false,
		3: false,
		4: false,
		5: false,
		6: false,
		7: false,
		8: false,
		9: false,
	},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorConsents: {},
	vendorLegitimateInterests: {},
	vendorsDisclosed: {},
};

/**
 * Consent state: All accepted
 * Represents "Accept All" user action
 */
export const CONSENT_ALL_ACCEPTED: TCFConsentData = {
	purposeConsents: {
		1: true,
		10: true,
		11: true,
		2: true,
		3: true,
		4: true,
		5: true,
		6: true,
		7: true,
		8: true,
		9: true,
	},
	purposeLegitimateInterests: {
		10: true,
		11: true,
		2: true,
		3: true,
		4: true,
		5: true,
		6: true,
		7: true,
		8: true,
		9: true,
	},
	specialFeatureOptIns: {
		1: true,
		2: true,
	},
	vendorConsents: {
		1: true,
		10: true,
		2: true,
		755: true,
	},
	vendorLegitimateInterests: {
		1: true,
		10: true,
		2: true,
		755: true,
	},
	vendorsDisclosed: {
		1: true,
		10: true,
		2: true,
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
		10: false,
		11: false,
		// Basic ads
		2: true,
		// Ad profiles
		3: true,
		// Personalized ads
		4: true,
		5: false,
		6: false,
		7: false,
		8: false,
		9: false,
	},
	purposeLegitimateInterests: {
		2: true,
		3: true,
		4: true,
	},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorConsents: {
		1: true,
		755: true,
	},
	vendorLegitimateInterests: {
		1: true,
		755: true,
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
		10: false,
		11: false,
		2: false,
		3: false,
		4: false,
		5: false,
		6: false,
		// Ad measurement
		7: true,
		// Content measurement
		8: true,
		// Audience insights,
		9: true,
	},
	purposeLegitimateInterests: {
		7: true,
		8: true,
		9: true,
	},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorConsents: {
		10: true,
	},
	vendorLegitimateInterests: {
		10: true,
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
		10: true,
		2: true,
		// Objected
		7: false,
		// Objected,
		9: false,
	},
	specialFeatureOptIns: {
		1: false,
		2: false,
	},
	vendorConsents: {
		1: true,
		10: true,
	},
	vendorLegitimateInterests: {
		1: true,
		// Objected
		10: false,
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
	specialFeatureOptIns: {
		// Precise geolocation
		1: true,
		// Device scanning
		2: true,
	},
	vendorConsents: {
		1: true,
	},
	vendorLegitimateInterests: {},
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
		10: true,
		11: true,
		2: true,
		3: false,
		4: false,
		5: true,
		6: true,
		7: true,
		8: false,
		9: false,
	},
	purposeLegitimateInterests: {
		10: true,
		11: true,
		2: true,
		5: true,
		6: true,
		7: false,
	},
	specialFeatureOptIns: {
		1: true,
		2: false,
	},
	vendorConsents: {
		1: true,
		10: true,
		2: false,
		755: true,
	},
	vendorLegitimateInterests: {
		1: true,
		10: false,
		2: false,
		755: true,
	},
	vendorsDisclosed: {
		1: true,
		10: true,
		2: true,
		755: true,
	},
};

/**
 * Consent state: Empty (initial state before user action)
 */
export const CONSENT_EMPTY: TCFConsentData = {
	purposeConsents: {},
	purposeLegitimateInterests: {},
	specialFeatureOptIns: {},
	vendorConsents: {},
	vendorLegitimateInterests: {},
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
		10: true,
		9: true,
	},
	specialFeatureOptIns: {
		1: true,
	},
	vendorConsents: {
		// Only Google
		755: true,
	},
	vendorLegitimateInterests: {
		755: true,
	},
	vendorsDisclosed: {
		755: true,
	},
};
