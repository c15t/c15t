/**
 * GET /consent/check schemas - Pre-banner cross-device consent check.
 *
 * @packageDocumentation
 */

import * as v from 'valibot';

/**
 * Query params for consent check
 */
export const checkConsentQuerySchema = v.object({
	/** External user ID to check */
	externalId: v.string(),
	/** Consent type(s) to check, comma-separated */
	type: v.string(),
});

/**
 * Result for a single consent type
 */
export const consentCheckResultSchema = v.object({
	/** Whether consent has been given for this type */
	hasConsent: v.boolean(),
	/** Whether the consent is for the latest policy version */
	isLatestPolicy: v.boolean(),
});

/**
 * Output schema for consent check
 */
export const checkConsentOutputSchema = v.object({
	/** Results keyed by consent type */
	results: v.record(v.string(), consentCheckResultSchema),
});

/**
 * Error schemas for consent check
 */
export const checkConsentErrorSchemas = {
	inputValidationFailed: v.object({
		formErrors: v.array(v.string()),
		fieldErrors: v.record(v.string(), v.array(v.string())),
	}),
	externalIdRequired: v.object({
		message: v.string(),
	}),
	typeRequired: v.object({
		message: v.string(),
	}),
};

// Type exports
export type CheckConsentQuery = v.InferOutput<typeof checkConsentQuerySchema>;
export type CheckConsentOutput = v.InferOutput<typeof checkConsentOutputSchema>;
export type ConsentCheckResult = v.InferOutput<typeof consentCheckResultSchema>;
