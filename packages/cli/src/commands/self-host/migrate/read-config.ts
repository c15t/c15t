import fs from 'node:fs/promises';
import path from 'node:path';
import {
	buildNamingVariants,
	DB,
	type NamingOptions,
} from '@c15t/backend/db/schema';
import { loadConfig } from 'c12';
import type { CliContext } from '~/context/types';

type MigratorDatabaseConfig = {
	adapter: Parameters<(typeof DB)['client']>[0];
	naming?: NamingOptions;
	tablePrefix?: string;
} & Record<string, unknown>;

export async function readConfigAndGetDb(
	context: CliContext,
	absoluteConfigPath: string
): Promise<{
	db: ReturnType<typeof DB.client>;
}> {
	const { logger } = context;

	logger.info(`Loading backend config from ${absoluteConfigPath}`);

	const resolvedPath = path.resolve(absoluteConfigPath);

	try {
		await fs.access(resolvedPath);
	} catch {
		throw new Error(`Backend config not found at: ${resolvedPath}`);
	}

	try {
		const { config } = await loadConfig<MigratorDatabaseConfig>({
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

		if (!config || typeof config !== 'object' || !('adapter' in config)) {
			throw new Error(
				'Invalid backend config: missing required "adapter" property'
			);
		}

		// Apply naming + tablePrefix before creating the client so generated
		// migrations and ORM schema match the runtime identifiers produced by
		// `c15tInstance` (see backend `init.ts`).
		let factory = DB;
		const variants = buildNamingVariants(config.naming);
		if (variants) {
			factory = factory.names(variants);
		}
		if (config.tablePrefix) {
			factory = factory.names.prefix(config.tablePrefix);
		}

		return {
			db: factory.client(config.adapter),
		};
	} catch (error) {
		logger.error('Failed to load backend config', error);
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Unknown error loading backend config: ${String(error)}`);
	}
}
