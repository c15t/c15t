/**
 * POST /subject schemas - Records consent (append-only).
 *
 * @packageDocumentation
 */

import * as v from 'valibot';
import { policyTypeSchema } from '../../domain/consent-policy';

/**
 * Base subject ID validation - must be in sub_xxx format
 */
export const subjectIdSchema = v.pipe(
	v.string(),
	v.regex(/^sub_[1-9A-HJ-NP-Za-km-z]+$/, 'Invalid subject ID format')
);

/**
 * Base consent input schema for POST /subject
 * Note: subjectId is now required (client-generated)
 */
const baseSubjectConsentSchema = v.object({
	/** Client-generated subject ID in sub_xxx format (required) */
	subjectId: subjectIdSchema,
	/** External subject ID from your auth system (optional) */
	externalSubjectId: v.optional(v.string()),
	/** Identity provider name (optional) */
	identityProvider: v.optional(v.string()),
	/** Domain where consent was given */
	domain: v.string(),
	/** Type of consent */
	type: policyTypeSchema,
	/** Additional metadata */
	metadata: v.optional(v.record(v.string(), v.unknown())),
	/** When the consent was given in epoch milliseconds */
	givenAt: v.number(),
	/** Jurisdiction code (e.g., 'GDPR', 'UK_GDPR', 'CCPA') */
	jurisdiction: v.optional(v.string()),
	/** Consent model used (e.g., 'opt-in', 'opt-out', 'iab') */
	jurisdictionModel: v.optional(v.string()),
	/** IAB TCF TC String (only for IAB consents) */
	tcString: v.optional(v.string()),
});

/**
 * Cookie banner consent - requires preferences
 */
export const subjectCookieBannerInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	type: v.literal('cookie_banner'),
	preferences: v.record(v.string(), v.boolean()),
});

/**
 * Policy-based consent
 */
export const subjectPolicyBasedInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	type: v.picklist(['privacy_policy', 'dpa', 'terms_and_conditions']),
	policyId: v.optional(v.string()),
	preferences: v.optional(v.record(v.string(), v.boolean())),
});

/**
 * Other consent types
 */
export const subjectOtherConsentInputSchema = v.object({
	...baseSubjectConsentSchema.entries,
	type: v.picklist(['marketing_communications', 'age_verification', 'other']),
	preferences: v.optional(v.record(v.string(), v.boolean())),
});

/**
 * POST /subject input schema - variant (discriminated union)
 */
export const postSubjectInputSchema = v.variant('type', [
	subjectCookieBannerInputSchema,
	subjectPolicyBasedInputSchema,
	subjectOtherConsentInputSchema,
]);

/**
 * POST /subject output schema
 */
export const postSubjectOutputSchema = v.object({
	subjectId: v.string(),
	consentId: v.string(),
	domainId: v.string(),
	domain: v.string(),
	type: policyTypeSchema,
	status: v.string(),
	recordId: v.string(),
	metadata: v.optional(v.record(v.string(), v.unknown())),
	givenAt: v.date(),
});

/**
 * Error schemas for POST /subject
 */
export const postSubjectErrorSchemas = {
	inputValidationFailed: v.object({
		formErrors: v.array(v.string()),
		fieldErrors: v.record(v.string(), v.array(v.string())),
	}),
	subjectCreationFailed: v.object({
		subjectId: v.string(),
	}),
	domainCreationFailed: v.object({
		domain: v.string(),
	}),
	policyNotFound: v.object({
		policyId: v.optional(v.string()),
		type: v.string(),
	}),
	policyInactive: v.object({
		policyId: v.string(),
		type: v.string(),
	}),
	policyCreationFailed: v.object({
		type: v.string(),
	}),
	purposeCreationFailed: v.object({
		purposeCode: v.string(),
	}),
	consentCreationFailed: v.object({
		subjectId: v.string(),
		domain: v.string(),
	}),
};

// Type exports
export type PostSubjectInput = v.InferOutput<typeof postSubjectInputSchema>;
export type PostSubjectOutput = v.InferOutput<typeof postSubjectOutputSchema>;
