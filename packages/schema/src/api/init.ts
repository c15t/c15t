import * as v from 'valibot';

import { brandingSchema } from '~/shared/branding';
import { globalVendorListSchema } from '~/shared/gvl';
import { jurisdictionCodeSchema } from '~/shared/jurisdiction';
import { nonIABVendorSchema } from '~/shared/non-iab-vendor';
import {
	policyModelSchema,
	policyScopeModeSchema,
	policyUiModeSchema,
	policyUiSurfaceConfigSchema,
} from '~/shared/policy-schema';
import { policyResolutionWireSchema } from '~/shared/policy-wire-schema';

/**
 * Title and description schema for translations
 */
export const titleDescriptionSchema = v.object({
	description: v.string(),
	title: v.string(),
});

/**
 * Partial title and description schema
 */
export const partialTitleDescriptionSchema = v.object({
	description: v.optional(v.string()),
	title: v.optional(v.string()),
});

/**
 * Complete translations schema for newer backend versions
 * All fields are required for full functionality
 */
export const completeTranslationsSchema = v.object({
	common: v.object({
		acceptAll: v.string(),
		customize: v.string(),
		rejectAll: v.string(),
		save: v.string(),
	}),
	consentManagerDialog: titleDescriptionSchema,
	consentTypes: v.object({
		experience: titleDescriptionSchema,
		functionality: titleDescriptionSchema,
		marketing: titleDescriptionSchema,
		measurement: titleDescriptionSchema,
		necessary: titleDescriptionSchema,
	}),
	cookieBanner: titleDescriptionSchema,
	frame: v.object({
		actionButton: v.string(),

		title: v.string(),
	}),
	legalLinks: v.object({
		cookiePolicy: v.string(),

		privacyPolicy: v.string(),
		termsOfService: v.string(),
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
			customize: v.optional(v.string()),
			rejectAll: v.optional(v.string()),
			save: v.optional(v.string()),
		})
	),
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
	cookieBanner: partialTitleDescriptionSchema,
	frame: v.optional(
		v.partial(
			v.object({
				actionButton: v.optional(v.string()),

				title: v.optional(v.string()),
			})
		)
	),
	legalLinks: v.optional(
		v.partial(
			v.object({
				cookiePolicy: v.optional(v.string()),

				privacyPolicy: v.optional(v.string()),
				termsOfService: v.optional(v.string()),
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
 * Matching strategy used to resolve the policy for the request.
 */
export const policyMatchedBySchema = v.picklist([
	'region',
	'country',
	'default',
	'fallback',
]);

/**
 * Resolved runtime policy returned by /init.
 */
export const resolvedPolicySchema = v.object({
	consent: v.optional(
		v.object({
			categories: v.optional(v.array(v.string())),
			expiryDays: v.optional(v.number()),
			gpc: v.optional(v.boolean()),

			preselectedCategories: v.optional(v.array(v.string())),
			scopeMode: v.optional(policyScopeModeSchema),
		})
	),
	i18n: v.optional(
		v.object({
			language: v.optional(v.string()),
			messageProfile: v.optional(v.string()),
		})
	),
	id: v.string(),
	model: policyModelSchema,
	proof: v.optional(
		v.object({
			storeIp: v.optional(v.boolean()),
			storeLanguage: v.optional(v.boolean()),

			storeUserAgent: v.optional(v.boolean()),
		})
	),
	ui: v.optional(
		v.object({
			banner: v.optional(policyUiSurfaceConfigSchema),
			dialog: v.optional(policyUiSurfaceConfigSchema),

			mode: v.optional(policyUiModeSchema),
		})
	),
});

/**
 * Explainability details for the resolved policy decision.
 */
export const policyDecisionSchema = v.object({
	country: v.nullable(v.string()),
	fingerprint: v.string(),
	jurisdiction: jurisdictionCodeSchema,
	matchedBy: policyMatchedBySchema,
	policyId: v.string(),
	region: v.nullable(v.string()),
});

/**
 * Output schema for init endpoint
 */
export const initOutputSchema = v.object({
	branding: brandingSchema,
	/**
	 * CMP ID registered with IAB Europe.
	 * Provided by the backend when IAB is enabled and a CMP ID is configured.
	 */
	cmpId: v.optional(v.number()),
	/**
	 * Custom vendors not registered with IAB.
	 * These are configured on the backend and synced to the frontend.
	 */
	customVendors: v.optional(v.array(nonIABVendorSchema)),
	/**
	 * Global Vendor List for IAB TCF compliance.
	 * Present when IAB is active for the resolved request policy.
	 * For policy-based setups, non-IAB policies omit this field.
	 * If absent (and response is 200), IAB mode should be disabled on client.
	 */
	gvl: v.optional(v.nullable(globalVendorListSchema)),
	jurisdiction: jurisdictionCodeSchema,
	location: locationSchema,
	/**
	 * Runtime policy resolved for the request's geo/jurisdiction context.
	 * Present only when backend policies are configured and a match is found.
	 *
	 * BRIDGE: v2 wire shape kept for clients that predate `policyResolution`.
	 * Removed in the v3 final sweep.
	 */
	policy: v.optional(resolvedPolicySchema),
	/**
	 * Explainability details for how the runtime policy was matched.
	 *
	 * BRIDGE: v2 wire shape kept for clients that predate `policyResolution`.
	 */
	policyDecision: v.optional(policyDecisionSchema),
	/**
	 * Versioned v3 policy resolution. `policy` inside it is explicit and
	 * nullable: `null` means no policy applies and clears policy-derived
	 * state. Absent only when the producer predates the contract.
	 */
	policyResolution: v.optional(policyResolutionWireSchema),
	/**
	 * Signed policy snapshot token to ensure write-time consistency.
	 * Present when backend policy snapshots are configured.
	 */
	policySnapshotToken: v.optional(v.string()),
	translations: v.object({
		language: v.string(),
		translations: translationsSchema,
	}),
});

export type InitOutput = v.InferOutput<typeof initOutputSchema>;
export type TranslationsResponse = v.InferOutput<typeof translationsSchema>;
export type LocationResponse = v.InferOutput<typeof locationSchema>;
/**
 * Runtime policy payload returned by `/init`.
 *
 * This is the fully resolved policy after backend geo/jurisdiction matching.
 * Frontend clients can persist this object and reuse it as an outage fallback.
 */
export type ResolvedPolicy = v.InferOutput<typeof resolvedPolicySchema>;
/**
 * Explainability metadata describing how the runtime policy was matched.
 *
 * Includes the match strategy (`matchedBy`), normalized location context,
 * and a deterministic policy fingerprint for snapshot consistency checks.
 */
export type PolicyDecision = v.InferOutput<typeof policyDecisionSchema>;
