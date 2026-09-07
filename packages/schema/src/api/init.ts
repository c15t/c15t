import * as v from 'valibot';

import { brandingSchema } from '~/shared/branding';
import { globalVendorListSchema } from '~/shared/gvl';
import { jurisdictionCodeSchema } from '~/shared/jurisdiction';
import { nonIABVendorSchema } from '~/shared/non-iab-vendor';
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
 * Cookie banner copy. The notice pair is used when the resolved policy
 * requires a `notice` prompt; older backends omit it.
 */
export const cookieBannerTranslationsSchema = v.object({
	...titleDescriptionSchema.entries,
	noticeDescription: v.optional(v.string()),
	noticeTitle: v.optional(v.string()),
});

/**
 * Partial cookie banner copy for older backend versions
 */
export const partialCookieBannerTranslationsSchema = v.object({
	...partialTitleDescriptionSchema.entries,
	noticeDescription: v.optional(v.string()),
	noticeTitle: v.optional(v.string()),
});

/**
 * Labels for persistent rights a surface exposes when no prompt action
 * covers them, such as the opt-out and preferences links on a notice.
 * Optional so older backends still validate.
 */
export const rightsTranslationsSchema = v.optional(
	v.object({
		optOut: v.optional(v.string()),
		preferences: v.optional(v.string()),
	})
);

/**
 * Complete translations schema for newer backend versions
 * All fields are required for full functionality
 */
export const completeTranslationsSchema = v.object({
	common: v.object({
		acceptAll: v.string(),
		customize: v.string(),
		dismiss: v.optional(v.string()),
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
	cookieBanner: cookieBannerTranslationsSchema,
	frame: v.object({
		actionButton: v.string(),

		title: v.string(),
	}),
	legalLinks: v.object({
		cookiePolicy: v.string(),

		privacyPolicy: v.string(),
		termsOfService: v.string(),
	}),
	rights: rightsTranslationsSchema,
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
			dismiss: v.optional(v.string()),
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
	cookieBanner: partialCookieBannerTranslationsSchema,
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
	rights: rightsTranslationsSchema,
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
	/** Explicit, versioned policy outcome for every complete response. */
	policyResolution: policyResolutionWireSchema,
	/**
	 * Signed policy snapshot token to ensure write-time consistency.
	 * Present when backend policy snapshots are configured.
	 */
	policySnapshotToken: v.optional(v.string()),
	/** Privacy signal used to resolve this request; never a recorded choice. */
	resolvedPrivacySignals: v.optional(
		v.object({ gpc: v.optional(v.boolean()) })
	),
	translations: v.object({
		language: v.string(),
		translations: translationsSchema,
	}),
});

export type InitOutput = v.InferOutput<typeof initOutputSchema>;
export type TranslationsResponse = v.InferOutput<typeof translationsSchema>;
export type LocationResponse = v.InferOutput<typeof locationSchema>;
