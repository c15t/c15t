import fs from 'node:fs/promises';
import path from 'node:path';
import type {
	AdapterConfiguration,
	AdapterName,
} from '@c15t/backend/v2/define-config';
import {
	drizzleAdapter,
	kyselyAdapter,
	mongoAdapter,
	prismaAdapter,
	typeormAdapter,
} from '@c15t/backend/v2/pkgs/db-adapters';
import { DB } from '@c15t/backend/v2/schema';
import { loadConfig } from 'c12';
import type { CliContext } from '~/context/types';

function getAdapter(
	adapter: AdapterName,
	options: AdapterConfiguration<AdapterName>['options']
) {
	switch (adapter) {
		case 'kysely':
			return kyselyAdapter(options);
		case 'drizzle':
			return drizzleAdapter(options);
		case 'prisma':
			return prismaAdapter(options);
		case 'typeorm':
			return typeormAdapter(options);
		case 'mongo':
			return mongoAdapter(options);
		default:
			throw new Error(`Unsupported adapter: ${adapter}`);
	}
}

export async function readConfigAndGetDb(
	context: CliContext,
	absoluteConfigPath: string
): Promise<ReturnType<typeof DB.client>> {
	const { logger } = context;

	logger.info(`Loading backend config from ${absoluteConfigPath}`);

	const resolvedPath = path.resolve(absoluteConfigPath);

	try {
		await fs.access(resolvedPath);
	} catch {
		throw new Error(`Backend config not found at: ${resolvedPath}`);
	}

	try {
		const { config } = await loadConfig<AdapterConfiguration<AdapterName>>({
			configFile: absoluteConfigPath,
			jitiOptions: {
				extensions: [
					'.ts',
					'.tsx',
					'.js',
					'.jsx',
					'.mjs',
					'.cjs',
					'.mts',
					'.cts',
					'.cjs',
				],
			},
		});

		logger.debug('Imported Config');

		logger.debug('Building Adapter', config.adapter);
		const adapter = getAdapter(config.adapter, config.options);

		const client = DB.client(adapter);

		return client;
	} catch (error) {
		logger.error('Failed to load backend config', error);
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Unknown error loading backend config: ${String(error)}`);
	}
}
