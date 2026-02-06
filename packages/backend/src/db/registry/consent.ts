import { HTTPException } from 'hono/http-exception';
import type { Consent } from '../schema';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function consentRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;

	return {
		createConsent: async (
			consent: Omit<Consent, 'id' | 'createdAt'> & Partial<Consent>
		) => {
			logger.debug('Creating consent', { consent });
			const createdConsent = await db.create('consent', {
				id: await generateUniqueId(db, 'consent', ctx),
				subjectId: consent.subjectId,
				domainId: consent.domainId,
				policyId: consent.policyId,
				purposeIds: consent.purposeIds,
				metadata: consent.metadata,
				ipAddress: consent.ipAddress,
				userAgent: consent.userAgent,
				status: consent.status,
				givenAt: consent.givenAt,
				isActive: consent.isActive,
			});

			if (!createdConsent) {
				throw new HTTPException(500, {
					message: 'Failed to create consent - operation returned null',
					cause: {
						code: 'CONSENT_CREATION_FAILED',
						subjectId: consent.subjectId,
						domainId: consent.domainId,
					},
				});
			}

			return createdConsent;
		},
	};
}
