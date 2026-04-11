import {
	legalDocumentCurrentInputSchema,
	legalDocumentCurrentOutputSchema,
	legalDocumentCurrentParamsSchema,
} from '@c15t/schema';
import { Hono } from 'hono';
import { describeRoute, resolver, validator as vValidator } from 'hono-openapi';
import { syncCurrentLegalDocumentHandler } from '~/handlers/legal-document/current.handler';
import type { C15TContext } from '~/types';

export const createLegalDocumentRoutes = () => {
	const app = new Hono<{ Variables: { c15tContext: C15TContext } }>();

	app.put(
		'/:type/current',
		describeRoute({
			summary: 'Sync the current legal document release (API key required)',
			description:
				'Marks a legal document release as the latest known version for its type. Requires a Bearer API key.',
			tags: ['LegalDocument'],
			security: [{ bearerAuth: [] }],
			responses: {
				200: {
					description: 'Current legal document release synced successfully',
					content: {
						'application/json': {
							schema: resolver(legalDocumentCurrentOutputSchema),
						},
					},
				},
				401: {
					description: 'Missing or invalid API key',
				},
				409: {
					description: 'Release metadata conflicts with an existing release',
				},
			},
		}),
		vValidator('param', legalDocumentCurrentParamsSchema),
		vValidator('json', legalDocumentCurrentInputSchema),
		syncCurrentLegalDocumentHandler
	);

	return app;
};
