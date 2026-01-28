/**
 * GET /consent/check schemas - Pre-banner cross-device consent check.
 *
 * @packageDocumentation
 */

import { z } from 'zod';

/**
 * Query params for consent check
 */
export const checkConsentQuerySchema = z.object({
	/** External user ID to check */
	externalId: z.string(),
	/** Consent type(s) to check, comma-separated */
	type: z.string(),
});

/**
 * Result for a single consent type
 */
export const consentCheckResultSchema = z.object({
	/** Whether consent has been given for this type */
	hasConsent: z.boolean(),
	/** Whether the consent is for the latest policy version */
	isLatestPolicy: z.boolean(),
});

/**
 * Output schema for consent check
 */
export const checkConsentOutputSchema = z.object({
	/** Results keyed by consent type */
	results: z.record(z.string(), consentCheckResultSchema),
});

/**
 * Error schemas for consent check
 */
export const checkConsentErrorSchemas = {
	inputValidationFailed: z.object({
		formErrors: z.array(z.string()),
		fieldErrors: z.record(z.string(), z.array(z.string())),
	}),
	externalIdRequired: z.object({
		message: z.string(),
	}),
	typeRequired: z.object({
		message: z.string(),
	}),
};

// Type exports
export type CheckConsentQuery = z.infer<typeof checkConsentQuerySchema>;
export type CheckConsentOutput = z.infer<typeof checkConsentOutputSchema>;
export type ConsentCheckResult = z.infer<typeof consentCheckResultSchema>;
