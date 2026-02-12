/**
 * GET /subjects/:id handler - Check this device's consent status.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { C15TContext } from '~/types';
import { extractErrorMessage } from '~/utils/extract-error-message';
import { enrichConsents } from '../utils/consent-enrichment';

/**
 * Handles retrieving a subject's consent status.
 *
 * Returns the subject's information and their consent records,
 * optionally filtered by consent type(s).
 */
export const getSubjectHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling GET /subjects/:id request');

	const { db, registry } = ctx;

	// Get input from validated params and query
	const subjectId = c.req.param('id');
	const type = c.req.query('type');
	const typeFilter = type?.split(',').map((t) => t.trim()) || [];

	logger.debug('Request parameters', { subjectId, typeFilter });

	try {
		// Find the subject
		const subject = await db.findFirst('subject', {
			where: (b) => b('id', '=', subjectId),
		});

		if (!subject) {
			throw new HTTPException(404, {
				message: 'Subject not found',
				cause: { code: 'SUBJECT_NOT_FOUND', subjectId },
			});
		}

		// Get all consents for this subject
		const consents = await db.findMany('consent', {
			where: (b) => b('subjectId', '=', subjectId),
		});

		const consentItems = await enrichConsents(consents, { db, registry });

		// Filter by type if specified
		const filteredConsents =
			typeFilter.length > 0
				? consentItems.filter((consent) => typeFilter.includes(consent.type))
				: consentItems;

		// Determine if consent is valid for requested types
		const isValid =
			typeFilter.length === 0 ||
			typeFilter.every((t) =>
				filteredConsents.some(
					(consent) => consent.type === t && consent.isLatestPolicy
				)
			);

		return c.json({
			subject: {
				id: subject.id,
				externalId: subject.externalId ?? undefined,
				isIdentified: subject.isIdentified,
				createdAt: subject.createdAt,
			},
			consents: filteredConsents,
			isValid,
		});
	} catch (error) {
		logger.error('Error in GET /subjects/:id handler', {
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
