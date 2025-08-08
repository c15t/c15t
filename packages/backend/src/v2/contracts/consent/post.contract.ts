import { oc } from '@orpc/contract';
import { z } from 'zod';

import { PolicyTypeSchema } from '~/v2/schema';

const baseConsentSchema = z.object({
	subjectId: z.string().optional(),
	externalSubjectId: z.string().optional(),
	domain: z.string(),
	type: PolicyTypeSchema,
	metadata: z.record(z.unknown()).optional(),
});

// Cookie banner needs preferences
const cookieBannerSchema = baseConsentSchema.extend({
	type: z.literal('cookie_banner'),
	preferences: z.record(z.boolean()),
});

// Policy based consent just needs the policy ID
const policyBasedSchema = baseConsentSchema.extend({
	type: z.enum(['privacy_policy', 'dpa', 'terms_and_conditions']),
	policyId: z.string().optional(),
	preferences: z.record(z.boolean()).optional(),
});

// Other consent types just need the base fields
const otherConsentSchema = baseConsentSchema.extend({
	type: z.enum(['marketing_communications', 'age_verification', 'other']),
	preferences: z.record(z.boolean()).optional(),
});

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
		// Input validation errors
		INPUT_VALIDATION_FAILED: {
			status: 422,
			message: 'Invalid input parameters',
			data: z.object({
				formErrors: z.array(z.string()),
				fieldErrors: z.record(z.string(), z.array(z.string())),
			}),
		},
		// Subject errors
		SUBJECT_CREATION_FAILED: {
			status: 400,
			message: 'Failed to create or find subject',
			data: z.object({
				subjectId: z.string().optional(),
				externalSubjectId: z.string().optional(),
			}),
		},
		// Domain errors
		DOMAIN_CREATION_FAILED: {
			status: 500,
			message: 'Failed to create or find domain',
			data: z.object({
				domain: z.string(),
			}),
		},
		// Policy errors
		POLICY_NOT_FOUND: {
			status: 404,
			message: 'Policy not found',
			data: z.object({
				policyId: z.string(),
				type: z.string(),
			}),
		},
		POLICY_INACTIVE: {
			status: 409,
			message: 'Policy is not active',
			data: z.object({
				policyId: z.string(),
				type: z.string(),
			}),
		},
		POLICY_CREATION_FAILED: {
			status: 500,
			message: 'Failed to create or find policy',
			data: z.object({
				type: z.string(),
			}),
		},
		// Purpose errors
		PURPOSE_CREATION_FAILED: {
			status: 500,
			message: 'Failed to create consent purpose',
			data: z.object({
				purposeCode: z.string(),
			}),
		},
		// Transaction errors
		CONSENT_CREATION_FAILED: {
			status: 500,
			message: 'Failed to create consent record',
			data: z.object({
				subjectId: z.string(),
				domain: z.string(),
			}),
		},
	})
	.input(
		z.discriminatedUnion('type', [
			cookieBannerSchema,
			policyBasedSchema,
			otherConsentSchema,
		])
	)
	.output(
		z.object({
			id: z.string(),
			subjectId: z.string().optional(),
			externalSubjectId: z.string().optional(),
			domainId: z.string(),
			domain: z.string(),
			type: PolicyTypeSchema,
			status: z.string(),
			recordId: z.string(),
			metadata: z.record(z.unknown()).optional(),
			givenAt: z.date(),
		})
	);
