import { oc } from '@orpc/contract';
import { z } from 'zod';
import { PolicyTypeSchema } from '~/schema';

/**
 * Contract for the verify consent endpoint
 * Verifies if a user has given consent for a specific policy
 */

// Input schema based on VerifyConsentRequestBody
const verifyConsentInputSchema = z
	.object({
		subjectId: z.string().optional(),
		externalSubjectId: z.string().optional(),
		domain: z.string(),
		type: PolicyTypeSchema,
		policyId: z.string().optional(),
		preferences: z.array(z.string()).optional(),
	})
	.strict();

// Minimal consent schema based on the response interface
const consentSchema = z
	.object({
		id: z.string(),
		purposeIds: z.array(z.string()),
	})
	.passthrough(); // Allow additional properties

// Output schema based on VerifyConsentResponse
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
		// Input validation errors
		INPUT_VALIDATION_FAILED: {
			status: 422,
			message: 'Invalid input parameters',
			data: z.object({
				formErrors: z.array(z.string()),
				fieldErrors: z.record(z.string(), z.array(z.string()).optional()),
			}),
		},
		// Subject errors
		SUBJECT_NOT_FOUND: {
			status: 404,
			message: 'Subject not found',
			data: z.object({
				subjectId: z.string().optional(),
				externalSubjectId: z.string().optional(),
			}),
		},
		// Domain errors
		DOMAIN_NOT_FOUND: {
			status: 404,
			message: 'Domain not found',
			data: z.object({
				domain: z.string(),
			}),
		},
		// Policy errors
		POLICY_NOT_FOUND: {
			status: 404,
			message: 'Policy not found or invalid',
			data: z.object({
				policyId: z.string(),
				type: z.string(),
			}),
		},
		// Purpose errors
		PURPOSES_NOT_FOUND: {
			status: 404,
			message: 'Could not find all specified purposes',
			data: z.object({
				preferences: z.array(z.string()),
				foundPurposes: z.array(z.string()),
			}),
		},
		// Cookie banner specific errors
		COOKIE_BANNER_PREFERENCES_REQUIRED: {
			status: 400,
			message: 'Preferences are required for cookie banner consent',
			data: z.object({
				type: z.literal('cookie_banner'),
			}),
		},
		// Consent errors
		NO_CONSENT_FOUND: {
			status: 404,
			message: 'No consent found for the given policy',
			data: z.object({
				policyId: z.string(),
				subjectId: z.string(),
				domainId: z.string(),
			}),
		},
	})
	.input(verifyConsentInputSchema)
	.output(
		z.object({
			isValid: z.boolean(),
			reasons: z.array(z.string()).optional(),
			consent: consentSchema.optional(),
		})
	);
