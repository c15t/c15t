import { z } from 'zod';
import { policyTypeSchema } from '~/domain/consent-policy';

/**
 * Base consent input schema
 */
const baseConsentSchema = z.object({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	identityProvider: z.string().optional(),
	domain: z.string(),
	type: policyTypeSchema,
	metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Cookie banner consent input schema - requires preferences
 */
export const cookieBannerInputSchema = baseConsentSchema.extend({
	type: z.literal('cookie_banner'),
	preferences: z.record(z.string(), z.boolean()),
});

/**
 * Policy-based consent input schema
 */
export const policyBasedInputSchema = baseConsentSchema.extend({
	type: z.enum(['privacy_policy', 'dpa', 'terms_and_conditions']),
	policyId: z.string().optional(),
	preferences: z.record(z.string(), z.boolean()).optional(),
});

/**
 * Other consent types input schema
 */
export const otherConsentInputSchema = baseConsentSchema.extend({
	type: z.enum(['marketing_communications', 'age_verification', 'other']),
	preferences: z.record(z.string(), z.boolean()).optional(),
});

/**
 * Combined input schema using discriminated union
 */
export const postConsentInputSchema = z.discriminatedUnion('type', [
	cookieBannerInputSchema,
	policyBasedInputSchema,
	otherConsentInputSchema,
]);

/**
 * Output schema for post consent endpoint
 */
export const postConsentOutputSchema = z.object({
	id: z.string(),
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domainId: z.string(),
	domain: z.string(),
	type: policyTypeSchema,
	status: z.string(),
	recordId: z.string(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	givenAt: z.date(),
});

/**
 * Error data schemas for post consent endpoint
 */
export const postConsentErrorSchemas = {
	inputValidationFailed: z.object({
		formErrors: z.array(z.string()),
		fieldErrors: z.record(z.string(), z.array(z.string())),
	}),
	subjectCreationFailed: z.object({
		subjectId: z.string().optional(),
		externalSubjectId: z.string().optional(),
	}),
	domainCreationFailed: z.object({
		domain: z.string(),
	}),
	policyNotFound: z.object({
		policyId: z.string(),
		type: z.string(),
	}),
	policyInactive: z.object({
		policyId: z.string(),
		type: z.string(),
	}),
	policyCreationFailed: z.object({
		type: z.string(),
	}),
	purposeCreationFailed: z.object({
		purposeCode: z.string(),
	}),
	consentCreationFailed: z.object({
		subjectId: z.string(),
		domain: z.string(),
	}),
};

export type PostConsentInput = z.infer<typeof postConsentInputSchema>;
export type PostConsentOutput = z.infer<typeof postConsentOutputSchema>;
