import { withDatabaseSpan } from '~/utils/instrumentation';
import { getMetrics } from '~/utils/metrics';
import type { PolicyType } from '../schema';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function policyRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;

	return {
		findConsentPolicyById: async (policyId: string) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'find', entity: 'consentPolicy' },
					async () => {
						const policy = await db.findFirst('consentPolicy', {
							where: (b) => b('id', '=', policyId),
						});
						return policy;
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'find', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'find',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
		findOrCreatePolicy: async (type: PolicyType) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'findOrCreate', entity: 'consentPolicy' },
					async () => {
						// Gets most recent active policy for a given type
						const existingPolicy = await db.findFirst('consentPolicy', {
							where: (b) =>
								b.and(b('isActive', '=', true), b('type', '=', type)),
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
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'findOrCreate', entity: 'consentPolicy' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'findOrCreate',
					entity: 'consentPolicy',
				});
				throw error;
			}
		},
	};
}
