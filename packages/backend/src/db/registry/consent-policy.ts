import type { PolicyType } from '../schema';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function policyRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;

	return {
		findConsentPolicyById: async (policyId: string) => {
			const policy = await db.findFirst('consentPolicy', {
				where: (b) => b('id', '=', policyId),
			});

			return policy;
		},
		findOrCreatePolicy: async (type: PolicyType) => {
			// Gets most recent active policy for a given type
			const existingPolicy = await db.findFirst('consentPolicy', {
				where: (b) => b.and(b('isActive', '=', true), b('type', '=', type)),
				orderBy: ['effectiveDate', 'desc'],
			});

			if (existingPolicy) {
				logger.debug('Found existing policy', {
					type,
					policyId: existingPolicy.id,
				});
				return existingPolicy;
			}

			const policy = await db.create('consentPolicy', {
				id: await generateUniqueId(db, 'consentPolicy', ctx),
				version: '1.0.0',
				type,
				effectiveDate: new Date(),
				isActive: true,
			});

			return policy;
		},
	};
}
