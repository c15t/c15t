/**
 * Subject routes - CRUD operations for consent subjects.
 *
 * @packageDocumentation
 */

import {
	getSubjectInputSchema,
	getSubjectOutputSchema,
	listSubjectsOutputSchema,
	listSubjectsQuerySchema,
	patchSubjectFullInputSchema,
	patchSubjectOutputSchema,
	postSubjectInputSchema,
	postSubjectOutputSchema,
} from '@c15t/schema';
import { Hono } from 'hono';
import { describeRoute, resolver, validator as vValidator } from 'hono-openapi';
import { getSubjectHandler } from '~/handlers/subject/get.handler';
import { listSubjectsHandler } from '~/handlers/subject/list.handler';
import { patchSubjectHandler } from '~/handlers/subject/patch.handler';
import { postSubjectHandler } from '~/handlers/subject/post.handler';
import type { C15TContext } from '~/types';

/**
 * Creates the subject routes
 */
export const createSubjectRoutes = () => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	// GET /subjects/:id - Get a subject's consent status
	app.get(
		'/:id',
		describeRoute({
			summary: 'Get subject consent status',
			description: `Returns the subject's consent status for this device. Use to check if the subject has valid consent for given policy types.

**Query:** \`type\` – Filter by consent type(s), comma-separated (e.g. \`privacy_policy,cookie_banner\`).

**Response:** \`subject\`, \`consents\` (matching filter), \`isValid\` (valid consent for requested type(s)).`,
			tags: ['Subject', 'Consent'],
			responses: {
				200: {
					description: 'Subject and consent records for the requested type(s)',
					content: {
						'application/json': {
							schema: resolver(getSubjectOutputSchema),
						},
					},
				},
				404: {
					description: 'Subject not found for the given ID',
				},
			},
		}),
		vValidator('param', getSubjectInputSchema),
		getSubjectHandler
	);

	// POST /subjects - Create a new consent record
	app.post(
		'/',
		describeRoute({
			summary: 'Record consent for a subject',
			description: `Creates a new consent record (append-only). Creates the subject if it does not exist.

**Request body by \`type\`:**
- \`cookie_banner\` – Requires \`preferences\` object
- \`privacy_policy\`, \`dpa\`, \`terms_and_conditions\` – Optional \`policyId\`
- \`marketing_communications\`, \`age_verification\`, \`other\` – Optional \`preferences\``,
			tags: ['Subject', 'Consent'],
			responses: {
				200: {
					description: 'Consent recorded; subject and consent in response',
					content: {
						'application/json': {
							schema: resolver(postSubjectOutputSchema),
						},
					},
				},
				422: {
					description: 'Invalid request body (schema or validation failed)',
				},
			},
		}),
		vValidator('json', postSubjectInputSchema),
		postSubjectHandler
	);

	// PATCH /subjects/:id - Link external ID to subject
	app.patch(
		'/:id',
		describeRoute({
			summary: 'Link external ID to subject',
			description:
				'Associates an external user ID with an existing subject (e.g. after login). Enables cross-device consent sync.',
			tags: ['Subject'],
			responses: {
				200: {
					description: 'Subject updated with external ID',
					content: {
						'application/json': {
							schema: resolver(patchSubjectOutputSchema),
						},
					},
				},
				404: {
					description: 'Subject not found for the given ID',
				},
			},
		}),
		vValidator('param', patchSubjectFullInputSchema),
		vValidator('json', patchSubjectFullInputSchema),
		patchSubjectHandler
	);

	// GET /subjects - List all subjects by external ID (requires API key)
	app.get(
		'/',
		describeRoute({
			summary: 'List subjects by external ID (API key required)',
			description:
				'Returns all subjects linked to the given external ID. Requires Bearer token (API key). Use for server-side consent lookups.',
			tags: ['Subject'],
			security: [{ bearerAuth: [] }],
			responses: {
				200: {
					description: 'List of subjects for the external ID',
					content: {
						'application/json': {
							schema: resolver(listSubjectsOutputSchema),
						},
					},
				},
				401: {
					description: 'Missing or invalid API key',
				},
			},
		}),
		vValidator('query', listSubjectsQuerySchema),
		listSubjectsHandler
	);

	return app;
};
