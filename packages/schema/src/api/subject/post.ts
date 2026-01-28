/**
 * POST /subject schemas - Records consent (append-only).
 *
 * @packageDocumentation
 */

import { z } from 'zod';
import { policyTypeSchema } from '../../domain/consent-policy';

/**
 * Base subject ID validation - must be in sub_xxx format
 */
export const subjectIdSchema = z
	.string()
	.regex(/^sub_[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid subject ID format');

/**
 * Base consent input schema for POST /subject
 * Note: subjectId is now required (client-generated)
 */
const baseSubjectConsentSchema = z.object({
	/** Client-generated subject ID in sub_xxx format (required) */
	subjectId: subjectIdSchema,
	/** External subject ID from your auth system (optional) */
	externalSubjectId: z.string().optional(),
	/** Identity provider name (optional) */
	identityProvider: z.string().optional(),
	/** Domain where consent was given */
	domain: z.string(),
	/** Type of consent */
	type: policyTypeSchema,
	/** Additional metadata */
	metadata: z.record(z.string(), z.unknown()).optional(),
	/** When the consent was given in epoch milliseconds */
	givenAt: z.number(),
	/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
	jurisdiction: z.string().optional(),
	/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
	jurisdictionModel: z.string().optional(),
	/** IAB TCF TC String (only for IAB consents) */
	tcString: z.string().optional(),
});

/**
 * Cookie banner consent - requires preferences
 */
export const subjectCookieBannerInputSchema = baseSubjectConsentSchema.extend({
	type: z.literal('cookie_banner'),
	preferences: z.record(z.string(), z.boolean()),
});

/**
 * Policy-based consent
 */
export const subjectPolicyBasedInputSchema = baseSubjectConsentSchema.extend({
	type: z.enum(['privacy_policy', 'dpa', 'terms_and_conditions']),
	policyId: z.string().optional(),
	preferences: z.record(z.string(), z.boolean()).optional(),
});

/**
 * Other consent types
 */
export const subjectOtherConsentInputSchema = baseSubjectConsentSchema.extend({
	type: z.enum(['marketing_communications', 'age_verification', 'other']),
	preferences: z.record(z.string(), z.boolean()).optional(),
});

/**
 * POST /subject input schema - discriminated union
 */
export const postSubjectInputSchema = z.discriminatedUnion('type', [
	subjectCookieBannerInputSchema,
	subjectPolicyBasedInputSchema,
	subjectOtherConsentInputSchema,
]);

/**
 * POST /subject output schema
 */
export const postSubjectOutputSchema = z.object({
	subjectId: z.string(),
	consentId: z.string(),
	domainId: z.string(),
	domain: z.string(),
	type: policyTypeSchema,
	status: z.string(),
	recordId: z.string(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	givenAt: z.date(),
});

/**
 * Error schemas for POST /subject
 */
export const postSubjectErrorSchemas = {
	inputValidationFailed: z.object({
		formErrors: z.array(z.string()),
		fieldErrors: z.record(z.string(), z.array(z.string())),
	}),
	subjectCreationFailed: z.object({
		subjectId: z.string(),
	}),
	domainCreationFailed: z.object({
		domain: z.string(),
	}),
	policyNotFound: z.object({
		policyId: z.string().optional(),
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

// Type exports
export type PostSubjectInput = z.infer<typeof postSubjectInputSchema>;
export type PostSubjectOutput = z.infer<typeof postSubjectOutputSchema>;
