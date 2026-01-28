/**
 * POST /subject contract - Records consent (append-only).
 *
 * @packageDocumentation
 */

import {
	postSubjectErrorSchemas,
	postSubjectInputSchema,
	postSubjectOutputSchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

export const postSubjectContract = oc
	.route({
		method: 'POST',
		path: '/subject',
		description: `Records a user's consent preferences (append-only).

This endpoint creates a new consent record for a subject. Each call appends to the audit trail,
preserving a complete history of consent changes.

Key features:
- Client-generated subject ID (required) - generated using generateSubjectId()
- Append-only - never updates, always creates new consent records
- Supports multiple consent types: cookie_banner, privacy_policy, terms_and_conditions, etc.
- Creates audit log for compliance

The subjectId must be in the format 'sub_<base58>' and should be stored in the client's cookie/localStorage.`,
		tags: ['subject', 'consent'],
	})
	.errors({
		INPUT_VALIDATION_FAILED: {
			status: 422,
			data: postSubjectErrorSchemas.inputValidationFailed,
			error: 'Invalid input parameters',
		},
		SUBJECT_CREATION_FAILED: {
			status: 400,
			data: postSubjectErrorSchemas.subjectCreationFailed,
			error: 'Failed to create subject',
		},
		DOMAIN_CREATION_FAILED: {
			status: 500,
			data: postSubjectErrorSchemas.domainCreationFailed,
			error: 'Failed to create or find domain',
		},
		POLICY_NOT_FOUND: {
			status: 404,
			data: postSubjectErrorSchemas.policyNotFound,
			error: 'Policy not found',
		},
		POLICY_INACTIVE: {
			status: 409,
			data: postSubjectErrorSchemas.policyInactive,
			error: 'Policy is not active',
		},
		POLICY_CREATION_FAILED: {
			status: 500,
			data: postSubjectErrorSchemas.policyCreationFailed,
			error: 'Failed to create or find policy',
		},
		PURPOSE_CREATION_FAILED: {
			status: 500,
			data: postSubjectErrorSchemas.purposeCreationFailed,
			error: 'Failed to create consent purpose',
		},
		CONSENT_CREATION_FAILED: {
			status: 500,
			data: postSubjectErrorSchemas.consentCreationFailed,
			error: 'Failed to create consent record',
		},
	})
	.input(postSubjectInputSchema)
	.output(postSubjectOutputSchema);
