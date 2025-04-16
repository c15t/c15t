import path from 'node:path';
import type { C15TOptions } from '@c15t/backend';
import { DoubleTieError } from '@c15t/backend/pkgs/results';
import { loadConfig } from 'c12';

import type { CliContext } from '../context/types';
import {
	type LoadedConfig,
	extractOptionsFromConfig,
} from './get-config/config-extraction';
import { validateConfig } from './get-config/config-validation';
import { configFileNames, monorepoSubdirs } from './get-config/constants';
import { findDirectories } from './get-config/directory-search';
import { jitiOptions } from './get-config/jiti-options';

/**
 * Get the c15t configuration by searching in standard locations and monorepo subdirectories.
 */
export async function getConfig(
	context: CliContext
): Promise<C15TOptions | null> {
	try {
		let options: C15TOptions | null = null;
		const { cwd, logger, flags } = context;
		const configPath = flags.config as string | undefined;

		const directoriesToSearch: string[] = [
			cwd,
			...findDirectories(cwd, monorepoSubdirs).map((dir) =>
				path.join(cwd, dir)
			),
		];

		const customJitiOptions = jitiOptions(context, cwd);

		for (const dir of directoriesToSearch) {
			try {
				const { config } = await loadConfig<LoadedConfig>({
					cwd: dir,
					jitiOptions: customJitiOptions,
					configFile: configPath,
					name: configFileNames[0], // Use the primary name for c12's default search
				});

				if (
					!config ||
					typeof config !== 'object' ||
					Object.keys(config).length === 0
				) {
					continue;
				}

				const extractedOptions = extractOptionsFromConfig(config);

				if (!extractedOptions) {
					continue;
				}

				if (!validateConfig(extractedOptions)) {
					throw new Error(
						'Invalid configuration file found, please check the documentation.'
					);
				}

				// If options have already been found, we have a double tie
				if (options) {
					throw new DoubleTieError(
						'Found multiple configuration files, please only specify one.'
					);
				}

				options = extractedOptions;
				logger.debug(`Found valid config in ${dir}`);
				// Found valid options, exit the loop
				//break;
			} catch (error) {
				// Use debug for errors during search in specific dirs
				// Only show these details if debugging is enabled
				logger.debug(
					`Failed to load or validate config from ${dir}:`,
					error
				);
			}
		}

		if (!options) {
			logger.info(
				'No configuration file found after searching specified directories.'
			);
			return null; // Return null if no config found after searching
		}

		// Return the found options
		return options;
	} catch (error) {
		// Handle broader errors during the config search process (e.g., DoubleTieError)
		context.logger.error('Error trying to load configuration:');
		
		return context.error.handleError(error, 'Error loading configuration');
	}
}
