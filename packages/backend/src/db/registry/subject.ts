import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function subjectRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;
	return {
		/**
		 * Finds or creates a subject.
		 *
		 * For the subject-centric API (v2.0):
		 * - subjectId is required and client-generated
		 * - Creates subject if it doesn't exist with the provided ID
		 * - externalSubjectId can be provided at creation time
		 * - Multiple subjects can have the same externalId (1:many relationship)
		 *
		 * @param subjectId - Client-generated subject ID (required for v2.0)
		 * @param externalSubjectId - Optional external user ID from auth system
		 * @param identityProvider - Optional identity provider name
		 * @param ipAddress - Client IP address
		 */
		findOrCreateSubject: async ({
			subjectId,
			externalSubjectId,
			identityProvider,
			ipAddress = 'unknown',
		}: {
			subjectId?: string;
			externalSubjectId?: string;
			identityProvider?: string;
			ipAddress?: string;
		}) => {
			// If subjectId is provided (v2.0 flow), find or create with that ID
			if (subjectId) {
				logger.debug('Finding/Creating subject with client-generated ID', {
					subjectId,
				});

				// Try to find existing subject
				const existingSubject = await db.findFirst('subject', {
					where: (b) => b('id', '=', subjectId),
				});

				if (existingSubject) {
					logger.debug('Found existing subject', { subjectId });

					// Update IP address if different
					if (existingSubject.lastIpAddress !== ipAddress) {
						await db.updateMany('subject', {
							where: (b) => b('id', '=', subjectId),
							set: {
								lastIpAddress: ipAddress,
								updatedAt: new Date(),
							},
						});
					}

					return existingSubject;
				}

				// Create new subject with client-provided ID
				logger.debug('Creating new subject with client-generated ID', {
					subjectId,
				});

				const newSubject = await db.create('subject', {
					id: subjectId,
					externalId: externalSubjectId ?? null,
					identityProvider: externalSubjectId
						? (identityProvider ?? 'external')
						: 'anonymous',
					lastIpAddress: ipAddress,
					isIdentified: !!externalSubjectId,
				});

				logger.debug('Created new subject', { subject: newSubject });

				return newSubject;
			}

			// Legacy flow: If only externalSubjectId provided, find or create
			// Note: This creates a new subject for each call since we don't have a subjectId
			// With 1:many relationship, we should not upsert by externalId anymore
			if (externalSubjectId) {
				logger.debug('Creating subject with external ID (legacy flow)', {
					externalSubjectId,
				});

				const subject = await db.create('subject', {
					id: await generateUniqueId(db, 'subject', ctx),
					externalId: externalSubjectId,
					identityProvider: identityProvider ?? 'external',
					lastIpAddress: ipAddress,
					isIdentified: true,
				});

				return subject;
			}

			// If no identifiers provided, create an anonymous subject
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
