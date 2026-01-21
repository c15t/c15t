import { z } from 'zod';
import { policyTypeSchema } from '../../domain/consent-policy';

/**
 * Input schema for verify consent endpoint
 */
export const verifyConsentInputSchema = z.strictObject({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domain: z.string(),
	type: policyTypeSchema,
	policyId: z.string().optional(),
	preferences: z.array(z.string()).optional(),
});

/**
 * Minimal consent schema for verify response
 */
export const verifyConsentResultSchema = z.looseObject({
	id: z.string(),
	purposeIds: z.array(z.string()),
});

/**
 * Output schema for verify consent endpoint
 */
export const verifyConsentOutputSchema = z.object({
	isValid: z.boolean(),
	reasons: z.array(z.string()).optional(),
	consent: verifyConsentResultSchema.optional(),
});

/**
 * Error data schemas for verify consent endpoint
 */
export const verifyConsentErrorSchemas = {
	inputValidationFailed: z.object({
		formErrors: z.array(z.string()),
		fieldErrors: z.record(z.string(), z.array(z.string()).optional()),
	}),
	subjectNotFound: z.object({
		subjectId: z.string().optional(),
		externalSubjectId: z.string().optional(),
	}),
	domainNotFound: z.object({
		domain: z.string(),
	}),
	policyNotFound: z.object({
		policyId: z.string(),
		type: z.string(),
	}),
	purposesNotFound: z.object({
		preferences: z.array(z.string()),
		foundPurposes: z.array(z.string()),
	}),
	cookieBannerPreferencesRequired: z.object({
		type: z.literal('cookie_banner'),
	}),
	noConsentFound: z.object({
		policyId: z.string(),
		subjectId: z.string(),
		domainId: z.string(),
	}),
};

export type VerifyConsentInput = z.infer<typeof verifyConsentInputSchema>;
export type VerifyConsentOutput = z.infer<typeof verifyConsentOutputSchema>;
