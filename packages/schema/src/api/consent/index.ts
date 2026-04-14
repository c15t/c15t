/**
 * Consent API schemas.
 *
 * @remarks
 * v2.0: Old consent schemas (post, verify, identify) have been removed.
 * Use the subject schemas for consent management.
 * Only the check schema remains for cross-device consent checking.
 *
 * @packageDocumentation
 */

export {
	type CheckConsentOutput,
	type CheckConsentQuery,
	type ConsentCheckResult,
	checkConsentErrorSchemas,
	checkConsentOutputSchema,
	checkConsentQuerySchema,
	consentCheckResultSchema,
} from './check';
