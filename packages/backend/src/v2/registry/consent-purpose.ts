import { DoubleTieError, ERROR_CODES } from '~/v2/pkgs/results';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function consentPurposeRegistry({ db, ctx: { logger } }: Registry) {
	return {
		findOrCreateConsentPurposeByCode: async (code: string) => {
			const existingPurpose = await db.findFirst('consentPurpose', {
				where: (b) => b('code', '=', code),
			});

			if (existingPurpose) {
				logger.debug('Found existing consent purpose', { code });
				return existingPurpose;
			}

			logger.debug('Creating consent purpose', { code });

			const createdPurpose = await db.create('consentPurpose', {
				id: await generateUniqueId(db, 'consentPurpose'),
				code,
				name: code,
				description: `Auto-created consentPurpose for ${code}`,
				isActive: true,
				isEssential: false,
				legalBasis: 'consent',
			});

			if (!createdPurpose) {
				throw new DoubleTieError(
					'Failed to create consent purpose - operation returned null',
					{
						code: ERROR_CODES.INTERNAL_SERVER_ERROR,
						status: 500,
					}
				);
			}

			return createdPurpose;
		},
	};
}
