import { oc } from '@orpc/contract';
import { z } from 'zod';
import { branding } from '~/types';

export const JurisdictionCodeSchema = z.enum([
	'UK_GDPR',
	'GDPR',
	'CH',
	'BR',
	'PIPEDA',
	'AU',
	'APPI',
	'PIPA',
	'CCPA',
	'NONE',
]);

export type JurisdictionCode = z.infer<typeof JurisdictionCodeSchema>;

const TitleDescriptionSchema = z.object({
	title: z.string(),
	description: z.string(),
});

/**
 * Complete translations schema for newer backend versions
 * All fields are required for full functionality
 */
const CompleteTranslationsSchema = z.object({
	common: z.object({
		acceptAll: z.string(),
		rejectAll: z.string(),
		customize: z.string(),
		save: z.string(),
	}),
	cookieBanner: TitleDescriptionSchema,
	consentManagerDialog: TitleDescriptionSchema,
	consentTypes: z.object({
		experience: TitleDescriptionSchema,
		functionality: TitleDescriptionSchema,
		marketing: TitleDescriptionSchema,
		measurement: TitleDescriptionSchema,
		necessary: TitleDescriptionSchema,
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
const PartialTranslationsSchema = z.object({
	common: z
		.object({
			acceptAll: z.string().optional(),
			rejectAll: z.string().optional(),
			customize: z.string().optional(),
			save: z.string().optional(),
		})
		.partial(),
	cookieBanner: TitleDescriptionSchema.partial(),
	consentManagerDialog: TitleDescriptionSchema.partial(),
	consentTypes: z
		.object({
			experience: TitleDescriptionSchema.partial(),
			functionality: TitleDescriptionSchema.partial(),
			marketing: TitleDescriptionSchema.partial(),
			measurement: TitleDescriptionSchema.partial(),
			necessary: TitleDescriptionSchema.partial(),
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
const TranslationsSchema = z.union([
	CompleteTranslationsSchema,
	PartialTranslationsSchema,
]);

export const initContract = oc
	.route({
		method: 'GET',
		path: '/init',
		description: `Initializes the consent manager and returns the initial state.
    
    - The jurisdiction of the user (Optional - Defaults to GDPR if Geo-Location is disabled)
    - The location of the user  (Optional - Defaults to null if Geo-Location is disabled)
    - The translations of the consent manager (Based of the accept-language header)
    - The branding of the consent manager 
    
Use this endpoint to implement geo-targeted consent banners and ensure compliance with regional privacy regulations.`,
		tags: ['cookie-banner'],
	})
	.output(
		z.object({
			jurisdiction: JurisdictionCodeSchema,
			location: z.object({
				countryCode: z.string().nullable(),
				regionCode: z.string().nullable(),
			}),
			translations: z.object({
				language: z.string(),
				translations: TranslationsSchema,
			}),
			branding: z.enum(branding),
		})
	);
