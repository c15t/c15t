/**
 * GET /subjects contract - List subjects by externalId (requires API key).
 *
 * @packageDocumentation
 */

import {
	listSubjectsErrorSchemas,
	listSubjectsOutputSchema,
	listSubjectsQuerySchema,
} from '@c15t/schema';
import { oc } from '@orpc/contract';

export const listSubjectsContract = oc
	.route({
		method: 'GET',
		path: '/subjects',
		description: `Lists all subjects linked to an external ID.

**Requires API key authentication via Authorization header:**
\`\`\`
Authorization: Bearer sk_live_xxx
\`\`\`

This endpoint is for server-side use only (Data Subject Access Requests).
Use it to retrieve all consent records across devices for a specific user.

Query parameters:
- externalId (required): The external user ID to query

Returns all subjects (devices) that have been linked to the given externalId,
along with their consent history.`,
		tags: ['subject', 'admin'],
	})
	.errors({
		INPUT_VALIDATION_FAILED: {
			status: 422,
			data: listSubjectsErrorSchemas.inputValidationFailed,
			error: 'Invalid input parameters',
		},
		UNAUTHORIZED: {
			status: 401,
			data: listSubjectsErrorSchemas.unauthorized,
			error: 'API key required',
		},
		EXTERNAL_ID_REQUIRED: {
			status: 400,
			data: listSubjectsErrorSchemas.externalIdRequired,
			error: 'externalId query parameter is required',
		},
	})
	.input(listSubjectsQuerySchema)
	.output(listSubjectsOutputSchema);
