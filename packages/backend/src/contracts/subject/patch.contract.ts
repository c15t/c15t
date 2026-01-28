/**
 * PATCH /subject/:id contract - Link external ID to subject.
 *
 * @packageDocumentation
 */

import {
	patchSubjectErrorSchemas,
	patchSubjectFullInputSchema,
	patchSubjectOutputSchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

export const patchSubjectContract = oc
	.route({
		method: 'PATCH',
		path: '/subject/{id}',
		description: `Links an external user ID to a subject after login.

Use this endpoint when a user logs in to link their authentication ID (externalId)
to their device's subject ID. This enables cross-device consent queries.

Note: Unlike the previous identify endpoint, this does NOT merge subjects.
Each device maintains its own independent consent history. The externalId
allows querying all subjects associated with a user via GET /subjects.

The identityProvider field is optional and can be used to indicate the
source of the external ID (e.g., 'auth0', 'clerk', 'firebase').`,
		tags: ['subject'],
	})
	.errors({
		INPUT_VALIDATION_FAILED: {
			status: 422,
			data: patchSubjectErrorSchemas.inputValidationFailed,
			error: 'Invalid input parameters',
		},
		SUBJECT_NOT_FOUND: {
			status: 404,
			data: patchSubjectErrorSchemas.subjectNotFound,
			error: 'Subject not found',
		},
	})
	.input(patchSubjectFullInputSchema)
	.output(patchSubjectOutputSchema);
