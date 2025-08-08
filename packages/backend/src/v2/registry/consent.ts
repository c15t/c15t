import { DoubleTieError, ERROR_CODES } from '~/v2/pkgs/results';
import type { Consent } from '../schema';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function consentRegistry({ db, ctx: { logger } }: Registry) {
	return {
		createConsent: async (
			consent: Omit<Consent, 'id' | 'createdAt'> & Partial<Consent>
		) => {
			logger.debug('Creating consent', { consent });
			const createdConsent = await db.create('consent', {
				id: await generateUniqueId(db, 'consent'),
				subjectId: consent.subjectId,
				domainId: consent.domainId,
				policyId: consent.policyId,
				purposeIds: consent.purposeIds,
				metadata: consent.metadata,
				ipAddress: consent.ipAddress,
				userAgent: consent.userAgent,
				status: consent.status,
				isActive: consent.isActive,
			});

			if (!createdConsent) {
				throw new DoubleTieError(
					'Failed to create consent - operation returned null',
					{
						code: ERROR_CODES.INTERNAL_SERVER_ERROR,
						status: 500,
					}
				);
			}

			return createdConsent;
		},
	};
}
