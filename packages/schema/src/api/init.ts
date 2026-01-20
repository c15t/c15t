import { z } from 'zod';
import { brandingSchema } from '~/shared/branding';
import { jurisdictionCodeSchema } from '~/shared/jurisdiction';

/**
 * Title and description schema for translations
 */
export const titleDescriptionSchema = z.object({
	title: z.string(),
	description: z.string(),
});

/**
 * Complete translations schema for newer backend versions
 * All fields are required for full functionality
 */
export const completeTranslationsSchema = z.object({
	common: z.object({
		acceptAll: z.string(),
		rejectAll: z.string(),
		customize: z.string(),
		save: z.string(),
	}),
	cookieBanner: titleDescriptionSchema,
	consentManagerDialog: titleDescriptionSchema,
	consentTypes: z.object({
		experience: titleDescriptionSchema,
		functionality: titleDescriptionSchema,
		marketing: titleDescriptionSchema,
		measurement: titleDescriptionSchema,
		necessary: titleDescriptionSchema,
	}),
	frame: z.object({
		title: z.string(),
		actionButton: z.string(),
	}),
	legalLinks: z.object({
		privacyPolicy: z.string(),
		termsOfService: z.string(),
		cookiePolicy: z.string(),
	}),
});

/**
 * Partial translations schema for backward compatibility with older backend versions
 * Allows missing fields to gracefully degrade functionality
 */
export const partialTranslationsSchema = z.object({
	common: z
		.object({
			acceptAll: z.string().optional(),
			rejectAll: z.string().optional(),
			customize: z.string().optional(),
			save: z.string().optional(),
		})
		.partial(),
	cookieBanner: titleDescriptionSchema.partial(),
	consentManagerDialog: titleDescriptionSchema.partial(),
	consentTypes: z
		.object({
			experience: titleDescriptionSchema.partial(),
			functionality: titleDescriptionSchema.partial(),
			marketing: titleDescriptionSchema.partial(),
			measurement: titleDescriptionSchema.partial(),
			necessary: titleDescriptionSchema.partial(),
		})
		.partial(),
	frame: z
		.object({
			title: z.string().optional(),
			actionButton: z.string().optional(),
		})
		.partial()
		.optional(),
	legalLinks: z
		.object({
			privacyPolicy: z.string().optional(),
			termsOfService: z.string().optional(),
			cookiePolicy: z.string().optional(),
		})
		.partial()
		.optional(),
});

/**
 * Union schema that accepts both complete and partial translations
 * Provides backward compatibility while maintaining type safety
 */
export const translationsSchema = z.union([
	completeTranslationsSchema,
	partialTranslationsSchema,
]);

/**
 * Location schema for init output
 */
export const locationSchema = z.object({
	countryCode: z.string().nullable(),
	regionCode: z.string().nullable(),
});

/**
 * Output schema for init endpoint
 */
export const initOutputSchema = z.object({
	jurisdiction: jurisdictionCodeSchema,
	location: locationSchema,
	translations: z.object({
		language: z.string(),
		translations: translationsSchema,
	}),
	branding: brandingSchema,
});

export type InitOutput = z.infer<typeof initOutputSchema>;
export type TranslationsResponse = z.infer<typeof translationsSchema>;
export type LocationResponse = z.infer<typeof locationSchema>;
