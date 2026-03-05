import * as v from 'valibot';
import { brandingSchema } from '~/shared/branding';
import { globalVendorListSchema } from '~/shared/gvl';
import { jurisdictionCodeSchema } from '~/shared/jurisdiction';
import { nonIABVendorSchema } from '~/shared/non-iab-vendor';

/**
 * Title and description schema for translations
 */
export const titleDescriptionSchema = v.object({
	title: v.string(),
	description: v.string(),
});

/**
 * Partial title and description schema
 */
export const partialTitleDescriptionSchema = v.object({
	title: v.optional(v.string()),
	description: v.optional(v.string()),
});

/**
 * Complete translations schema for newer backend versions
 * All fields are required for full functionality
 */
export const completeTranslationsSchema = v.object({
	common: v.object({
		acceptAll: v.string(),
		rejectAll: v.string(),
		customize: v.string(),
		save: v.string(),
	}),
	cookieBanner: titleDescriptionSchema,
	consentManagerDialog: titleDescriptionSchema,
	consentTypes: v.object({
		experience: titleDescriptionSchema,
		functionality: titleDescriptionSchema,
		marketing: titleDescriptionSchema,
		measurement: titleDescriptionSchema,
		necessary: titleDescriptionSchema,
	}),
	frame: v.object({
		title: v.string(),
		actionButton: v.string(),
	}),
	legalLinks: v.object({
		privacyPolicy: v.string(),
		termsOfService: v.string(),
		cookiePolicy: v.string(),
	}),
});

/**
 * Partial translations schema for backward compatibility with older backend versions
 * Allows missing fields to gracefully degrade functionality
 */
export const partialTranslationsSchema = v.object({
	common: v.partial(
		v.object({
			acceptAll: v.optional(v.string()),
			rejectAll: v.optional(v.string()),
			customize: v.optional(v.string()),
			save: v.optional(v.string()),
		})
	),
	cookieBanner: partialTitleDescriptionSchema,
	consentManagerDialog: partialTitleDescriptionSchema,
	consentTypes: v.partial(
		v.object({
			experience: partialTitleDescriptionSchema,
			functionality: partialTitleDescriptionSchema,
			marketing: partialTitleDescriptionSchema,
			measurement: partialTitleDescriptionSchema,
			necessary: partialTitleDescriptionSchema,
		})
	),
	frame: v.optional(
		v.partial(
			v.object({
				title: v.optional(v.string()),
				actionButton: v.optional(v.string()),
			})
		)
	),
	legalLinks: v.optional(
		v.partial(
			v.object({
				privacyPolicy: v.optional(v.string()),
				termsOfService: v.optional(v.string()),
				cookiePolicy: v.optional(v.string()),
			})
		)
	),
});

/**
 * Union schema that accepts both complete and partial translations
 * Provides backward compatibility while maintaining type safety
 */
export const translationsSchema = v.union([
	completeTranslationsSchema,
	partialTranslationsSchema,
]);

/**
 * Location schema for init output
 */
export const locationSchema = v.object({
	countryCode: v.nullable(v.string()),
	regionCode: v.nullable(v.string()),
});

/**
 * Runtime consent model resolved by backend policy.
 */
export const consentModelSchema = v.picklist([
	'opt-in',
	'opt-out',
	'none',
	'iab',
]);

/**
 * Matching strategy used to resolve the policy for the request.
 */
export const policyMatchedBySchema = v.picklist([
	'region',
	'country',
	'jurisdiction',
	'default',
]);

/**
 * UI mode selected by policy.
 */
export const policyUiModeSchema = v.picklist(['none', 'banner', 'dialog']);

/**
 * Allowed UI actions selected by policy.
 */
export const policyUiActionSchema = v.picklist([
	'accept',
	'reject',
	'customize',
]);

/**
 * Layout style for policy-driven action rendering.
 */
export const policyUiActionLayoutSchema = v.picklist(['split', 'inline']);

/**
 * Presentation profile for policy-driven action styling.
 */
export const policyUiProfileSchema = v.picklist([
	'balanced',
	'compact',
	'strict',
]);

/**
 * Surface-level action configuration for policy-driven UI.
 */
export const policyUiSurfaceSchema = v.object({
	allowedActions: v.optional(v.array(policyUiActionSchema)),
	primaryAction: v.optional(policyUiActionSchema),
	actionOrder: v.optional(v.array(policyUiActionSchema)),
	actionLayout: v.optional(policyUiActionLayoutSchema),
	uiProfile: v.optional(policyUiProfileSchema),
});

/**
 * Scope behavior for purposes outside policy allowlist.
 */
export const policyScopeModeSchema = v.picklist(['strict', 'unmanaged']);

/**
 * Resolved runtime policy returned by /init.
 */
export const resolvedPolicySchema = v.object({
	id: v.string(),
	model: consentModelSchema,
	i18n: v.optional(
		v.object({
			language: v.optional(v.string()),
			messageProfile: v.optional(v.string()),
		})
	),
	consent: v.optional(
		v.object({
			expiryDays: v.optional(v.number()),
			scopeMode: v.optional(policyScopeModeSchema),
			purposeIds: v.optional(v.array(v.string())),
		})
	),
	ui: v.optional(
		v.object({
			mode: v.optional(policyUiModeSchema),
			banner: v.optional(policyUiSurfaceSchema),
			dialog: v.optional(policyUiSurfaceSchema),
		})
	),
	proof: v.optional(
		v.object({
			storeIp: v.optional(v.boolean()),
			storeUserAgent: v.optional(v.boolean()),
			storeLanguage: v.optional(v.boolean()),
		})
	),
});

/**
 * Explainability details for the resolved policy decision.
 */
export const policyDecisionSchema = v.object({
	policyId: v.string(),
	fingerprint: v.string(),
	matchedBy: policyMatchedBySchema,
	country: v.nullable(v.string()),
	region: v.nullable(v.string()),
	jurisdiction: jurisdictionCodeSchema,
});

/**
 * Output schema for init endpoint
 */
export const initOutputSchema = v.object({
	jurisdiction: jurisdictionCodeSchema,
	location: locationSchema,
	translations: v.object({
		language: v.string(),
		translations: translationsSchema,
	}),
	branding: brandingSchema,
	/**
	 * Global Vendor List for IAB TCF compliance.
	 * Present when IAB is active for the resolved request policy.
	 * For policy-based setups, non-IAB policies omit this field.
	 * If absent (and response is 200), IAB mode should be disabled on client.
	 */
	gvl: v.optional(v.nullable(globalVendorListSchema)),
	/**
	 * Custom vendors not registered with IAB.
	 * These are configured on the backend and synced to the frontend.
	 */
	customVendors: v.optional(v.array(nonIABVendorSchema)),
	/**
	 * CMP ID registered with IAB Europe.
	 * Provided by the backend when IAB is enabled and a CMP ID is configured.
	 */
	cmpId: v.optional(v.number()),
	/**
	 * Runtime policy resolved for the request's geo/jurisdiction context.
	 * Present only when backend policies are configured and a match is found.
	 */
	policy: v.optional(resolvedPolicySchema),
	/**
	 * Explainability details for how the runtime policy was matched.
	 */
	policyDecision: v.optional(policyDecisionSchema),
	/**
	 * Signed policy snapshot token to ensure write-time consistency.
	 * Present when backend policy snapshots are configured.
	 */
	policySnapshotToken: v.optional(v.string()),
});

export type InitOutput = v.InferOutput<typeof initOutputSchema>;
export type TranslationsResponse = v.InferOutput<typeof translationsSchema>;
export type LocationResponse = v.InferOutput<typeof locationSchema>;
export type ResolvedPolicy = v.InferOutput<typeof resolvedPolicySchema>;
export type PolicyDecision = v.InferOutput<typeof policyDecisionSchema>;
