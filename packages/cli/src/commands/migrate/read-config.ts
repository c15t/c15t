import fs from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseConfig } from '@c15t/backend/v2/define-config';
import { DB } from '@c15t/backend/v2/schema';
import { loadConfig } from 'c12';
import type { CliContext } from '~/context/types';

export async function readConfigAndGetDb(
	context: CliContext,
	absoluteConfigPath: string
): Promise<{
	db: ReturnType<typeof DB.client>;
	adapter: DatabaseConfig['type'];
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
		const { config } = await loadConfig<DatabaseConfig>({
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

		return {
			db: DB.client(config.adapter),
			adapter: config.type,
		};
	} catch (error) {
		logger.error('Failed to load backend config', error);
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Unknown error loading backend config: ${String(error)}`);
	}
}
