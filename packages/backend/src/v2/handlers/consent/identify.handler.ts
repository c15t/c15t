import { ORPCError } from '@orpc/server';
import { os } from '~/v2/contracts';
import { generateUniqueId } from '~/v2/db/registry/utils';
import type { C15TContext } from '~/v2/types';

export const identifyUser = os.consent.identify.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const { db, logger } = typedContext;
		logger.info('Handling identify-user request');

		const { consentId, externalId } = input;

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
			await tx.updateMany('subject', {
				where: (b) => b('id', '=', consent.subjectId),
				set: {
					externalId,
					identityProvider: 'external',
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
				},
			});
		});

		return { success: true };
	}
);
