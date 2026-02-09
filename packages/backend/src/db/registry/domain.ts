import { HTTPException } from 'hono/http-exception';
import { withDatabaseSpan } from '~/utils/instrumentation';
import { getMetrics } from '~/utils/metrics';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function domainRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;

	const findDomainByName = async (name: string) => {
		const start = Date.now();
		try {
			const result = await withDatabaseSpan(
				{ operation: 'find', entity: 'domain' },
				async () => {
					const domain = await db.findFirst('domain', {
						where: (b) => b('name', '=', name),
					});

					if (!domain) {
						logger.debug('No domain found', { name });
					}

					return domain;
				}
			);
			getMetrics()?.recordDbQuery(
				{ operation: 'find', entity: 'domain' },
				Date.now() - start
			);
			return result;
		} catch (error) {
			getMetrics()?.recordDbError({
				operation: 'find',
				entity: 'domain',
			});
			throw error;
		}
	};

	return {
		findDomainByName,
		findOrCreateDomain: async (name: string) => {
			const start = Date.now();
			try {
				const result = await withDatabaseSpan(
					{ operation: 'findOrCreate', entity: 'domain' },
					async () => {
						const existingDomain = await db.findFirst('domain', {
							where: (b) => b('name', '=', name),
						});

						if (existingDomain) {
							logger.debug('Found existing domain', { name });
							return existingDomain;
						}

						logger.debug('Creating new domain', { name });
						const domain = await db.create('domain', {
							id: await generateUniqueId(db, 'domain', ctx),
							name,
						});

						if (!domain) {
							throw new HTTPException(503, {
								message: 'Failed to create domain',
								cause: {
									code: 'DOMAIN_CREATION_FAILED',
									name,
								},
							});
						}

						return domain;
					}
				);
				getMetrics()?.recordDbQuery(
					{ operation: 'findOrCreate', entity: 'domain' },
					Date.now() - start
				);
				return result;
			} catch (error) {
				getMetrics()?.recordDbError({
					operation: 'findOrCreate',
					entity: 'domain',
				});
				throw error;
			}
		},
	};
}
