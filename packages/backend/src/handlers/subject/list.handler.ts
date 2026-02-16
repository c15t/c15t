/**
 * GET /subjects handler - List subjects by externalId (requires API key).
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';
import { enrichConsents } from '../utils/consent-enrichment';

/**
 * Handles listing all subjects linked to an external ID.
 *
 * This endpoint requires API key authentication and is intended
 * for server-side use only (Data Subject Access Requests).
 */
export const listSubjectsHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling GET /subjects request');

	const { db, registry } = ctx;

	// Check API key authentication
	if (!ctx.apiKeyAuthenticated) {
		throw new HTTPException(401, {
			message: 'API key required. Use Authorization: Bearer <api_key>',
			cause: { code: 'UNAUTHORIZED' },
		});
	}

	const externalId = c.req.query('externalId');

	if (!externalId) {
		throw new HTTPException(422, {
			message: 'externalId query parameter is required',
			cause: { code: 'EXTERNAL_ID_REQUIRED' },
		});
	}

	logger.debug('Request parameters', { externalId });

	try {
		// Find all subjects with this externalId
		const subjects = await db.findMany('subject', {
			where: (b) => b('externalId', '=', externalId),
		});

		// Get consents for each subject
		const subjectItems = await Promise.all(
			subjects.map(async (subject) => {
				const consents = await db.findMany('consent', {
					where: (b) => b('subjectId', '=', subject.id),
				});

				const consentItems = await enrichConsents(consents, { db, registry });

				return {
					id: subject.id,
					externalId: subject.externalId ?? externalId,
					createdAt: subject.createdAt,
					consents: consentItems,
				};
			})
		);

		logger.info('Found subjects for externalId', {
			externalId,
			count: subjectItems.length,
		});

		return c.json({
			subjects: subjectItems,
		});
	} catch (error) {
		logger.error('Error in GET /subjects handler', {
			error: extractErrorMessage(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof HTTPException) {
			throw error;
		}

		throw new HTTPException(500, {
			message: 'Internal server error',
			cause: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}
};
