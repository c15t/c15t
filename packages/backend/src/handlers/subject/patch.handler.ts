/**
 * PATCH /subject/:id handler - Link external ID to subject.
 *
 * @packageDocumentation
 */

import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import { generateUniqueId } from '~/db/registry/utils';
import type { C15TContext } from '~/types';

/**
 * Handles linking an external ID to a subject.
 *
 * Unlike the legacy identify endpoint, this does NOT merge subjects.
 * Each device maintains its own independent consent history.
 * The externalId allows querying all subjects via GET /subjects.
 */
export const patchSubject = os.subject.patch.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const logger = typedContext.logger;
		logger.info('Handling PATCH /subject/:id request');

		const { db } = typedContext;

		// Flat input structure: { id, externalId, identityProvider? }
		const { id: subjectId, externalId, identityProvider = 'external' } = input;

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
				throw new ORPCError('SUBJECT_NOT_FOUND', {
					data: {
						subjectId,
					},
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
					id: await generateUniqueId(tx, 'auditLog', typedContext),
					subjectId,
					entityType: 'subject',
					entityId: subjectId,
					actionType: 'identify_user',
					ipAddress: typedContext.ipAddress || null,
					userAgent: typedContext.userAgent || null,
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

			return {
				success: true,
				subject: {
					id: subjectId,
					externalId,
					isIdentified: true,
				},
			};
		} catch (error) {
			logger.error('Error in PATCH /subject/:id handler', {
				error: error instanceof Error ? error.message : String(error),
				errorType:
					error instanceof Error ? error.constructor.name : typeof error,
			});

			if (error instanceof ORPCError) {
				throw error;
			}

			throw new ORPCError('INTERNAL_SERVER_ERROR', {
				message: error instanceof Error ? error.message : String(error),
			});
		}
	}
);
