import { DoubleTieError, ERROR_CODES } from '~/v2/pkgs/results';
import type { Registry } from './types';

export function domainRegistry({ db, ctx: { logger } }: Registry) {
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
				name,
				description: `Auto-created domain for ${name}`,
				isActive: true,
				isVerified: true,
				allowedOrigins: [],
			});

			if (!domain) {
				throw new DoubleTieError('Failed to create domain', {
					code: ERROR_CODES.INTERNAL_SERVER_ERROR,
					status: 503,
				});
			}

			return domain;
		},
	};
}
