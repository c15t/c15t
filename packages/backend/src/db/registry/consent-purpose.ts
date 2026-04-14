import { HTTPException } from 'hono/http-exception';
import { withDatabaseSpan } from '~/utils/instrumentation';
import { getMetrics } from '~/utils/metrics';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function consentPurposeRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;
	return {
		findOrCreateConsentPurposeByCode: async (code: string) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'findOrCreate', entity: 'consentPurpose' },
					async () => {
						const existingPurpose = await db.findFirst('consentPurpose', {
							where: (b) => b('code', '=', code),
						});

						if (existingPurpose) {
							logger.debug('Found existing consent purpose', {
								code,
							});
							return existingPurpose;
						}

						logger.debug('Creating consent purpose', { code });

						const createdPurpose = await db.create('consentPurpose', {
							id: await generateUniqueId(db, 'consentPurpose', ctx),
							code,
						});

						if (!createdPurpose) {
							throw new HTTPException(500, {
								message: 'Failed to create consent purpose',
								cause: {
									code: 'PURPOSE_CREATION_FAILED',
									purposeCode: code,
								},
							});
						}

						return createdPurpose;
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'findOrCreate', entity: 'consentPurpose' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'findOrCreate',
					entity: 'consentPurpose',
				});
				throw error;
			}
		},
	};
}
