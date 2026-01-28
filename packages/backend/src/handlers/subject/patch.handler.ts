/**
 * PATCH /subjects/:id handler - Link external ID to subject.
 *
 * @packageDocumentation
 */

import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { generateUniqueId } from '~/db/registry/utils';
import type { C15TContext } from '~/types';

/**
 * Handles linking an external ID to a subject.
 *
 * Unlike the legacy identify endpoint, this does NOT merge subjects.
 * Each device maintains its own independent consent history.
 * The externalId allows querying all subjects via GET /subjects.
 */
export const patchSubjectHandler = async (c: Context) => {
	const ctx = c.get('c15tContext') as C15TContext;
	const logger = ctx.logger;
	logger.info('Handling PATCH /subjects/:id request');

	const { db } = ctx;

	// Get input from validated params and body
	const subjectId = c.req.param('id');
	const body = await c.req.json<{
		externalId: string;
		identityProvider?: string;
	}>();
	const { externalId, identityProvider = 'external' } = body;

	logger.debug('Request parameters', {
		subjectId,
		externalId,
		identityProvider,
	});

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

		// Update the subject with externalId (no merge logic)
		await db.transaction(async (tx) => {
			await tx.updateMany('subject', {
				where: (b) => b('id', '=', subjectId),
				set: {
					externalId,
					identityProvider,
					isIdentified: true,
					updatedAt: new Date(),
				},
			});

			// Create audit log
			await tx.create('auditLog', {
				id: await generateUniqueId(tx, 'auditLog', ctx),
				subjectId,
				entityType: 'subject',
				entityId: subjectId,
				actionType: 'identify_user',
				ipAddress: ctx.ipAddress || null,
				userAgent: ctx.userAgent || null,
				eventTimezone: 'UTC',
				metadata: {
					externalId,
					identityProvider,
				},
			});
		});

		logger.info('Subject linked to external ID', {
			subjectId,
			externalId,
			identityProvider,
		});

		return c.json({
			success: true,
			subject: {
				id: subjectId,
				externalId,
				isIdentified: true,
			},
		});
	} catch (error) {
		logger.error('Error in PATCH /subjects/:id handler', {
			error: error instanceof Error ? error.message : String(error),
			errorType: error instanceof Error ? error.constructor.name : typeof error,
		});

		if (error instanceof HTTPException) {
			throw error;
		}

		throw new HTTPException(500, {
			message: error instanceof Error ? error.message : String(error),
			cause: { code: 'INTERNAL_SERVER_ERROR' },
		});
	}
};
