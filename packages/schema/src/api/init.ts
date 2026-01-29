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
	 * Present when server has GVL configured.
	 * If absent (and response is 200), IAB mode should be disabled on client.
	 */
	gvl: v.optional(v.nullable(globalVendorListSchema)),
	/**
	 * Custom vendors not registered with IAB.
	 * These are configured on the backend and synced to the frontend.
	 */
	customVendors: v.optional(v.array(nonIABVendorSchema)),
});

export type InitOutput = v.InferOutput<typeof initOutputSchema>;
export type TranslationsResponse = v.InferOutput<typeof translationsSchema>;
export type LocationResponse = v.InferOutput<typeof locationSchema>;
