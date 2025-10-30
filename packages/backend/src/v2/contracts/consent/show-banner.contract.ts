import { oc } from '@orpc/contract';
import { z } from 'zod';
import { branding } from '~/v2/types';
import { JurisdictionInfoSchema } from '../shared/jurisdiction.schema';

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

export const showConsentBannerContract = oc
	.route({
		method: 'GET',
		path: '/show-consent-banner',
		description: `Determines if a user should see a consent banner based on their location and applicable privacy regulations.
This endpoint performs the following checks:

1. Detects the user's location using various header information:
   - Cloudflare country headers
   - Vercel IP country headers
   - AWS CloudFront headers
   - Custom country code headers

2. Determines the applicable jurisdiction based on the location:
   - GDPR (EU/EEA/UK)
   - Swiss Data Protection Act
   - LGPD (Brazil)
   - PIPEDA (Canada)
   - Australian Privacy Principles
   - APPI (Japan)
   - PIPA (South Korea)

3. Returns detailed information about:
   - Whether to show the consent banner
   - The applicable jurisdiction and its requirements
   - The user's detected location (country and region)

Use this endpoint to implement geo-targeted consent banners and ensure compliance with regional privacy regulations.`,
		tags: ['cookie-banner'],
	})
	.output(
		z.object({
			showConsentBanner: z.boolean(),
			jurisdiction: JurisdictionInfoSchema,
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
