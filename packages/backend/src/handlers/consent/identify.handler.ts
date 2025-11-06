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
				// Check if a different subject already has this externalId
				const existingSubject = await tx.findOne({
					model: 'subject',
					where: [
						{
							field: 'externalId',
							value: externalId,
						},
						{
							field: 'id',
							value: consent.subjectId,
							connector: 'AND',
							operator: 'ne',
						},
					],
				});

				if (existingSubject && 'id' in existingSubject) {
					// Merge subjects: keep the old one, delete the current one
					// Update all references from current subject to old subject
					const currentSubjectId = consent.subjectId;
					const oldSubjectId = existingSubject.id as string;

					logger.info('Merging subjects', {
						currentSubjectId,
						oldSubjectId,
						externalId,
					});

					// Update all consent records
					await tx.updateMany({
						model: 'consent',
						where: [
							{
								field: 'subjectId',
								value: currentSubjectId,
							},
						],
						update: {
							subjectId: oldSubjectId,
						},
					});

					// Update all consentRecord records
					await tx.updateMany({
						model: 'consentRecord',
						where: [
							{
								field: 'subjectId',
								value: currentSubjectId,
							},
						],
						update: {
							subjectId: oldSubjectId,
						},
					});

					// Update all auditLog records
					await tx.updateMany({
						model: 'auditLog',
						where: [
							{
								field: 'subjectId',
								value: currentSubjectId,
							},
						],
						update: {
							subjectId: oldSubjectId,
						},
					});

					// Delete the current subject record
					await tx.deleteMany({
						model: 'subject',
						where: [
							{
								field: 'id',
								value: currentSubjectId,
							},
						],
					});

					// Create audit log with the old subject ID
					await tx.create({
						model: 'auditLog',
						data: {
							subjectId: oldSubjectId,
							entityType: 'consent',
							entityId: consent.id,
							actionType: 'identify_user',
							ipAddress: typedContext.ipAddress || null,
							userAgent: typedContext.userAgent || null,
							eventTimezone: 'UTC',
							metadata: {
								externalId,
								mergedFrom: currentSubjectId,
							},
						},
					});
				} else {
					// No existing subject with this externalId, proceed normally
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
				}
			},
		});

		return { success: true };
	}
);
