import {
	verifyConsentErrorSchemas,
	verifyConsentInputSchema,
	verifyConsentOutputSchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

/**
 * Contract for the verify consent endpoint
 * Verifies if a user has given consent for a specific policy
 */
export const verifyConsentContract = oc
	.route({
		method: 'POST',
		path: '/consent/verify',
		description: `Verifies if a user has given valid consent for a specific policy and domain.
This endpoint performs comprehensive consent verification by:

1. Validating the subject's identity (using subjectId or externalSubjectId)
2. Verifying the domain's existence and validity
3. Checking if the specified policy exists and is active
4. Validating that all required purposes have been consented to
5. Ensuring the consent record is current and valid

The endpoint supports different types of consent verification:
- Cookie banner consent verification
- Privacy policy consent verification
- Terms and conditions verification
- Marketing communications consent verification
- Age verification
- Custom consent types

Use this endpoint to ensure compliance with privacy regulations and to verify user consent before processing personal data.`,
		tags: ['consent'],
	})
	.errors({
		INPUT_VALIDATION_FAILED: {
			status: 422,
			data: verifyConsentErrorSchemas.inputValidationFailed,
			error: 'Invalid input parameters',
		},
		SUBJECT_NOT_FOUND: {
			status: 404,
			data: verifyConsentErrorSchemas.subjectNotFound,
			error: 'Subject not found',
		},
		DOMAIN_NOT_FOUND: {
			status: 404,
			data: verifyConsentErrorSchemas.domainNotFound,
			error: 'Domain not found',
		},
		POLICY_NOT_FOUND: {
			status: 404,
			data: verifyConsentErrorSchemas.policyNotFound,
			error: 'Policy not found or invalid',
		},
		PURPOSES_NOT_FOUND: {
			status: 404,
			data: verifyConsentErrorSchemas.purposesNotFound,
			error: 'Could not find all specified purposes',
		},
		COOKIE_BANNER_PREFERENCES_REQUIRED: {
			status: 400,
			data: verifyConsentErrorSchemas.cookieBannerPreferencesRequired,
			error: 'Preferences are required for cookie banner consent',
		},
		NO_CONSENT_FOUND: {
			status: 404,
			data: verifyConsentErrorSchemas.noConsentFound,
			error: 'No consent found for the given policy',
		},
	})
	.input(verifyConsentInputSchema)
	.output(verifyConsentOutputSchema);
