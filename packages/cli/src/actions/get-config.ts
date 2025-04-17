import fs from 'node:fs/promises';
import path from 'node:path';
import type { C15TOptions } from '@c15t/backend';
import type { ConsentManagerOptions } from '@c15t/react';
import { loadConfig } from 'c12';

import type { CliContext } from '../context/types';
import { isC15TOptions, isClientOptions } from './get-config/config-extraction';
import {} from './get-config/constants';
import { jitiOptions } from './get-config/jiti-options';

/**
 * Gets the configuration for the CLI.
 * @param contextOrOptions Either a CliContext object or a simplified object with just cwd and configPath
 * @returns The loaded configuration or null if it could not be loaded
 */
export async function getConfig(
	contextOrOptions: CliContext | { cwd: string; configPath?: string }
): Promise<C15TOptions | ConsentManagerOptions | null> {
	// Create a minimal context for test cases that don't provide a full CliContext
	const context =
		'logger' in contextOrOptions
			? contextOrOptions
			: {
					...contextOrOptions,
					logger: {
						debug: console.debug,
						info: console.info,
						warn: console.warn,
						error: console.error,
					},
					flags: { config: contextOrOptions.configPath },
					error: {
						handleError: (error: unknown) => {
							console.error('Error loading configuration:', error);
							return null;
						},
					},
				};

	const { cwd, logger, flags } = context as CliContext;
	const configPath = flags.config as string | undefined;
	let foundConfigPath: string | null = null;

	try {
		let options: C15TOptions | ConsentManagerOptions | null = null;
		const customJitiOptions = jitiOptions(context as CliContext, cwd);

		// --- Manual Check for Prioritized Locations ---
		if (configPath) {
			// If --config is used, trust that path directly
			foundConfigPath = path.resolve(cwd, configPath);
			logger.debug(`Using explicitly provided config path: ${foundConfigPath}`);
		} else {
			// Only search manually if --config flag wasn't used
			const prioritizedDirs = [cwd, path.join(cwd, 'packages/cli')]; // Add packages/cli explicitly
			const primaryName = 'c15t.config'; // Base name to check
			const extensions = ['.ts', '.js', '.mjs'];

			for (const dir of prioritizedDirs) {
				for (const ext of extensions) {
					const checkPath = path.join(dir, `${primaryName}${ext}`);
					try {
						await fs.access(checkPath);
						foundConfigPath = checkPath;
						logger.debug(`Found config via manual check: ${foundConfigPath}`);
						break; // Found it
					} catch {
						// File doesn't exist, continue checking
					}
				}
				if (foundConfigPath) break; // Stop searching directories if found
			}
		}

		// --- Load the found config file (if any) ---
		if (foundConfigPath) {
			try {
				logger.debug(
					`Loading configuration from resolved path: ${foundConfigPath}`
				);
				const result = await loadConfig({
					configFile: foundConfigPath,
					jitiOptions: customJitiOptions,
				});

				options = result.config as C15TOptions | ConsentManagerOptions | null;

				// Validate loaded config
				if (options) {
					logger.debug('Raw loaded config:', options);

					if (isC15TOptions(options) || isClientOptions(options)) {
						logger.debug('Configuration validated successfully.');
						return options;
					}

					logger.debug('Loaded config does not match expected schema');
					return null;
				}

				logger.debug('No configuration loaded from explicit path');
				// Fall through to broader search if manual load fails
			} catch (error) {
				// Log but continue searching, don't rethrow
				logger.debug('Error loading config from explicit path:', error);
				// Fall through to broader search if manual load fails
			}
		}

		return options;
	} catch (error) {
		// Handle errors based on context type
		if (
			'error' in context &&
			context.error &&
			typeof context.error.handleError === 'function'
		) {
			return context.error.handleError(error, 'Error loading configuration');
		}

		// Fallback error handling for tests
		console.error('Error loading configuration:', error);
		return null;
	}
}
