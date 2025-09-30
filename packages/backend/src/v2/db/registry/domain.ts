import { ORPCError } from '@orpc/server';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function domainRegistry({ db, ctx }: Registry) {
	const { logger } = ctx;

	const findDomainByName = async (name: string) => {
		const domain = await db.findFirst('domain', {
			where: (b) => b('name', '=', name),
		});

		if (!domain) {
			logger.debug('No domain found', { name });
		}

		return domain;
	};

	return {
		findDomainByName,
		findOrCreateDomain: async (name: string) => {
			const existingDomain = await findDomainByName(name);

			if (existingDomain) {
				logger.debug('Found existing domain', { name });
				return existingDomain;
			}

			logger.debug('Creating new domain', { name });
			const domain = await db.create('domain', {
				id: await generateUniqueId(db, 'domain', ctx),
				name,
				description: `Auto-created domain for ${name}`,
				isActive: true,
				isVerified: true,
				allowedOrigins: [],
			});

			if (!domain) {
				throw new ORPCError('DOMAIN_CREATION_FAILED', {
					message: 'Failed to create domain',
					status: 503,
					data: { name },
				});
			}

			return domain;
		},
	};
}
