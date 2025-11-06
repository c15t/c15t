import { ORPCError } from '@orpc/server';
import { os } from '~/v2/contracts';
import { generateUniqueId } from '~/v2/db/registry/utils';
import type { C15TContext } from '~/v2/types';

export const identifyUser = os.consent.identify.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const { db, logger } = typedContext;
		logger.info('Handling identify-user request');

		const { consentId, externalId, identityProvider = 'external' } = input;

		const consent = await db.findFirst('consent', {
			where: (b) => b('id', '=', consentId),
		});

		if (!consent) {
			throw new ORPCError('CONSENT_NOT_FOUND', {
				data: {
					consentId,
				},
			});
		}

		await db.transaction(async (tx) => {
			// Check if a different subject already has this externalId
			const existingSubject = await tx.findFirst('subject', {
				where: (b) =>
					b.and(
						b('externalId', '=', externalId),
						b('id', '!=', consent.subjectId)
					),
			});

			if (existingSubject) {
				// Merge subjects: keep the old one, delete the current one
				// Update all references from current subject to old subject
				const currentSubjectId = consent.subjectId;
				const oldSubjectId = existingSubject.id;

				logger.info('Merging subjects', {
					currentSubjectId,
					oldSubjectId,
					externalId,
					identityProvider,
				});

				// Update all consent records
				await tx.updateMany('consent', {
					where: (b) => b('subjectId', '=', currentSubjectId),
					set: {
						subjectId: oldSubjectId,
					},
				});

				// Update all consentRecord records
				await tx.updateMany('consentRecord', {
					where: (b) => b('subjectId', '=', currentSubjectId),
					set: {
						subjectId: oldSubjectId,
					},
				});

				// Update all auditLog records
				await tx.updateMany('auditLog', {
					where: (b) => b('subjectId', '=', currentSubjectId),
					set: {
						subjectId: oldSubjectId,
					},
				});

				// Delete the current subject record
				await tx.deleteMany('subject', {
					where: (b) => b('id', '=', currentSubjectId),
				});

				// Create audit log with the old subject ID
				await tx.create('auditLog', {
					id: await generateUniqueId(tx, 'auditLog', typedContext),
					subjectId: oldSubjectId,
					entityType: 'consent',
					entityId: consent.id,
					actionType: 'identify_user',
					ipAddress: typedContext.ipAddress || null,
					userAgent: typedContext.userAgent || null,
					eventTimezone: 'UTC',
					metadata: {
						externalId,
						identityProvider,
						mergedFrom: currentSubjectId,
					},
				});
			} else {
				// No existing subject with this externalId, proceed normally
				await tx.updateMany('subject', {
					where: (b) => b('id', '=', consent.subjectId),
					set: {
						externalId,
						identityProvider,
						isIdentified: true,
						updatedAt: new Date(),
					},
				});

				await tx.create('auditLog', {
					id: await generateUniqueId(tx, 'auditLog', typedContext),
					subjectId: consent.subjectId,
					entityType: 'consent',
					entityId: consent.id,
					actionType: 'identify_user',
					ipAddress: typedContext.ipAddress || null,
					userAgent: typedContext.userAgent || null,
					eventTimezone: 'UTC',
					metadata: {
						externalId,
						identityProvider,
					},
				});
			}
		});

		return { success: true };
	}
);
