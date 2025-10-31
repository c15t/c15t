import { ORPCError } from '@orpc/server';
import { os } from '~/contracts';
import { validateEntityOutput } from '~/schema/definition';
import type { C15TContext } from '~/types';

export const identifyUser = os.consent.identify.handler(
	async ({ input, context }) => {
		const typedContext = context as C15TContext;
		const { adapter, logger } = typedContext;
		logger.info('Handling identify-user request');

		const { consentId, externalId } = input;

		const rawConsent = await adapter.findOne({
			model: 'consent',
			where: [
				{
					field: 'id',
					value: consentId,
				},
			],
		});

		const consent = rawConsent
			? validateEntityOutput('consent', rawConsent, typedContext.options)
			: null;

		if (!consent) {
			throw new ORPCError('CONSENT_NOT_FOUND', {
				data: {
					consentId,
				},
			});
		}

		await typedContext.adapter.transaction({
			callback: async (tx) => {
				await tx.update({
					model: 'subject',
					where: [
						{
							field: 'id',
							value: consent.subjectId,
						},
					],
					update: {
						externalId,
						identityProvider: 'external',
						isIdentified: true,
						updatedAt: new Date(),
					},
				});

				// Create audit log entry
				await tx.create({
					model: 'auditLog',
					data: {
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
					},
				});
			},
		});

		return { success: true };
	}
);
