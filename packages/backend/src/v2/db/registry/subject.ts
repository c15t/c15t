import { ORPCError } from '@orpc/server';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function subjectRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;
	return {
		findOrCreateSubject: async ({
			subjectId,
			externalSubjectId,
			ipAddress = 'unknown',
		}: {
			subjectId?: string;
			externalSubjectId?: string;
			ipAddress?: string;
		}) => {
			// If both subjectId and externalSubjectId are provided, validate they match
			if (subjectId && externalSubjectId) {
				const subject = await db.findFirst('subject', {
					where: (b) =>
						b.and(
							b('id', '=', subjectId),
							b('externalId', '=', externalSubjectId)
						),
				});

				if (!subject) {
					logger?.error('Subject not found', {
						providedSubjectId: subjectId,
						providedExternalId: externalSubjectId,
					});

					throw new ORPCError('SUBJECT_NOT_FOUND', {
						message:
							'The specified subject could not be found. Please verify the subject identifiers and try again.',
						status: 404,
						data: {
							providedSubjectId: subjectId,
							providedExternalId: externalSubjectId,
						},
					});
				}

				return subject;
			}

			// Try to find subject by subjectId if provided
			if (subjectId) {
				const subject = await db.findFirst('subject', {
					where: (b) => b('id', '=', subjectId),
				});

				if (!subject) {
					throw new ORPCError('SUBJECT_NOT_FOUND', {
						message: 'Subject not found by subjectId',
						status: 404,
						data: { subjectId },
					});
				}

				return subject;
			}

			// If externalSubjectId provided, try to find or create with upsert
			if (externalSubjectId) {
				logger.debug('Finding/Creating subject with external id');
				await db.upsert('subject', {
					where: (b) => b('externalId', '=', externalSubjectId),
					create: {
						id: await generateUniqueId(db, 'subject', ctx),
						externalId: externalSubjectId,
						identityProvider: 'anonymous',
						lastIpAddress: ipAddress,
						isIdentified: !!externalSubjectId,
					},
					update: { lastIpAddress: ipAddress },
				});

				const subject = await db.findFirst('subject', {
					where: (b) => b('externalId', '=', externalSubjectId),
				});

				return subject;
			}

			// If unknown, create an anonymous subject
			logger?.debug('Creating new anonymous subject');
			const subject = await db.create('subject', {
				id: await generateUniqueId(db, 'subject', ctx),
				externalId: null,
				identityProvider: 'anonymous',
				lastIpAddress: ipAddress,
				isIdentified: false,
			});

			logger.debug('Created new anonymous subject', { subject });

			return subject;
		},
	};
}
