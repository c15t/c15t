/**
 * GET /consent/check contract - Pre-banner cross-device consent check.
 *
 * @packageDocumentation
 */

import {
	type CheckConsentOutput,
	type CheckConsentQuery,
	checkConsentErrorSchemas,
	checkConsentOutputSchema,
	checkConsentQuerySchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

// Re-export types for convenience
export type { CheckConsentOutput, CheckConsentQuery };

export const checkConsentContract = oc
	.route({
		method: 'GET',
		path: '/consent/check',
		description: `Check if an externalId has consented to specific policies on any device.

Use this endpoint BEFORE showing consent banners to check if the user
has already consented on another device.

**Example flow:**
1. User visits desktop, logs in
2. Call GET /consent/check?externalId=user_123&type=privacy_policy,cookie_banner
3. If privacy_policy.hasConsent is true → skip privacy policy banner
4. If cookie_banner.hasConsent is false → show cookie banner

Query parameters:
- externalId (required): The external user ID to check
- type (required): Consent type(s) to check, comma-separated

Returns minimal data (just booleans) for privacy:
- No subject IDs
- No consent details
- No PII

Rate limited aggressively and CORS restricted to trusted origins.`,
		tags: ['consent'],
	})
	.errors({
		INPUT_VALIDATION_FAILED: {
			status: 422,
			data: checkConsentErrorSchemas.inputValidationFailed,
			error: 'Invalid input parameters',
		},
		EXTERNAL_ID_REQUIRED: {
			status: 400,
			data: checkConsentErrorSchemas.externalIdRequired,
			error: 'externalId query parameter is required',
		},
		TYPE_REQUIRED: {
			status: 400,
			data: checkConsentErrorSchemas.typeRequired,
			error: 'type query parameter is required',
		},
	})
	.input(checkConsentQuerySchema)
	.output(checkConsentOutputSchema);
