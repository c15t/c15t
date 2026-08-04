/**
 * Loading `c15t-backend.config.ts`.
 *
 * 2.x pulled an `adapter` out of the config and handed it to fumadb. 3.0 needs
 * only the `database` field, which is either `{ dialect, url }` or a
 * `SqlClient` layer the host built itself.
 *
 * The layer form is accepted here as well as the config form, because a config
 * file is code and someone will reasonably reach for it — sharing a pool with
 * an application, or pointing the migrator at a test database.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { DatabaseOption } from '@c15t/backend-next';
import { loadConfig } from 'c12';
import type { CliContext } from '~/context/types';

interface BackendConfig extends Record<string, unknown> {
	database?: DatabaseOption;
}

/**
 * Reads the config and returns its `database` option.
 *
 * @throws when the file is missing, unreadable, or has no `database`.
 */
export async function readDatabaseConfig(
	context: CliContext,
	absoluteConfigPath: string
): Promise<DatabaseOption> {
	const { logger } = context;
	const resolvedPath = path.resolve(absoluteConfigPath);

	logger.info(`Loading backend config from ${resolvedPath}`);

	try {
		await fs.access(resolvedPath);
	} catch {
		throw new Error(`Backend config not found at: ${resolvedPath}`);
	}

	try {
		const { config } = await loadConfig<BackendConfig>({
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
				],
			},
		});

		if (
			!config ||
			typeof config !== 'object' ||
			config.database === undefined
		) {
			// Names the 2.x field explicitly: someone upgrading hits this, and
			// "missing database" alone would not tell them their existing config
			// is the reason.
			throw new Error(
				'Invalid backend config: missing required "database" property. ' +
					'c15t 3.0 replaced 2.x\'s "adapter" field — see the upgrade guide.'
			);
		}

		return config.database;
	} catch (error) {
		logger.error('Failed to load backend config', error);
		if (error instanceof Error) {
			throw error;
		}
		throw new Error(`Unknown error loading backend config: ${String(error)}`);
	}
}
