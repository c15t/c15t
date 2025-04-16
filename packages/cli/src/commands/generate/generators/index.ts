import type { C15TOptions } from '@c15t/backend';
import type { Adapter } from '@c15t/backend/pkgs/db-adapters';

import type { CliContext } from '~/context/types';
import { generateDrizzleSchema } from './drizzle';
import { generateMigrations } from './kysely';
import { generatePrismaSchema } from './prisma';

export const adapters = {
	prisma: generatePrismaSchema,
	drizzle: generateDrizzleSchema,
	kysely: generateMigrations,
};

export const getGenerator = (
	context: CliContext,
	opts: {
		adapter: Adapter;
		file?: string;
		options: C15TOptions;
	}
) => {
	const adapter = opts.adapter;
	const generator =
		adapter.id in adapters
			? adapters[adapter.id as keyof typeof adapters]
			: null;
	if (!generator) {
		context.logger.error(`${adapter.id} is not supported.`);
		process.exit(1);
	}
	return generator(opts);
};
