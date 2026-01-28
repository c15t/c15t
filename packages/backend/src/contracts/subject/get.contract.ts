/**
 * GET /subject/:id contract - Check this device's consent status.
 *
 * @packageDocumentation
 */

import {
	getSubjectErrorSchemas,
	getSubjectInputSchema,
	getSubjectOutputSchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

export const getSubjectContract = oc
	.route({
		method: 'GET',
		path: '/subject/{id}',
		description: `Retrieves a subject's consent status for this device.

Use this endpoint to check if a subject has agreed to specific policies.

Query parameters:
- type: Filter by consent type(s), comma-separated (e.g., "privacy_policy,cookie_banner")

Response includes:
- subject: Basic subject information
- consents: Array of consent records matching the filter
- isValid: Boolean indicating if valid consent exists for the requested type(s)

Each consent record includes:
- isLatestPolicy: Whether this consent is for the latest version of the policy
- preferences: The specific preferences (for cookie_banner type)
- givenAt: When consent was given`,
		tags: ['subject', 'consent'],
	})
	.errors({
		INPUT_VALIDATION_FAILED: {
			status: 422,
			data: getSubjectErrorSchemas.inputValidationFailed,
			error: 'Invalid input parameters',
		},
		SUBJECT_NOT_FOUND: {
			status: 404,
			data: getSubjectErrorSchemas.subjectNotFound,
			error: 'Subject not found',
		},
	})
	.input(getSubjectInputSchema)
	.output(getSubjectOutputSchema);
