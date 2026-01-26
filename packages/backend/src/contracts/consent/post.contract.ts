import {
	postConsentErrorSchemas,
	postConsentInputSchema,
	postConsentOutputSchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

export const postConsentContract = oc
	.route({
		method: 'POST',
		path: '/consent/set',
		description: `Records a user's consent preferences and creates necessary consent records.
This endpoint handles various types of consent submissions:

1. Cookie Banner Consent:
   - Records granular cookie preferences
   - Supports multiple consent purposes
   - Creates audit trail for compliance

2. Policy-Based Consent:
   - Privacy Policy acceptance
   - Data Processing Agreement (DPA) consent
   - Terms and Conditions acceptance
   - Links consent to specific policy versions

3. Other Consent Types:
   - Marketing communications preferences
   - Age verification consent
   - Custom consent types

The endpoint performs the following operations:
- Creates or retrieves subject records
- Validates domain and policy information
- Creates consent records with audit trails
- Records consent purposes and preferences
- Generates audit logs for compliance

Use this endpoint to record user consent and maintain a compliant consent management system.`,
		tags: ['consent', 'cookie-banner'],
	})
	.errors({
		INPUT_VALIDATION_FAILED: {
			status: 422,
			data: postConsentErrorSchemas.inputValidationFailed,
			error: 'Invalid input parameters',
		},
		SUBJECT_CREATION_FAILED: {
			status: 400,
			data: postConsentErrorSchemas.subjectCreationFailed,
			error: 'Failed to create or find subject',
		},
		DOMAIN_CREATION_FAILED: {
			status: 500,
			data: postConsentErrorSchemas.domainCreationFailed,
			error: 'Failed to create or find domain',
		},
		POLICY_NOT_FOUND: {
			status: 404,
			data: postConsentErrorSchemas.policyNotFound,
			error: 'Policy not found',
		},
		POLICY_INACTIVE: {
			status: 409,
			data: postConsentErrorSchemas.policyInactive,
			error: 'Policy is not active',
		},
		POLICY_CREATION_FAILED: {
			status: 500,
			data: postConsentErrorSchemas.policyCreationFailed,
			error: 'Failed to create or find policy',
		},
		PURPOSE_CREATION_FAILED: {
			status: 500,
			data: postConsentErrorSchemas.purposeCreationFailed,
			error: 'Failed to create consent purpose',
		},
		CONSENT_CREATION_FAILED: {
			status: 500,
			data: postConsentErrorSchemas.consentCreationFailed,
			error: 'Failed to create consent record',
		},
	})
	.input(postConsentInputSchema)
	.output(postConsentOutputSchema);
