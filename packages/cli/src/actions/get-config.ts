import fs from 'node:fs/promises';
import path from 'node:path';
import type { C15TOptions } from '@c15t/backend';
import type { ConsentManagerOptions } from '@c15t/react';
import { loadConfig } from 'c12';

import type { CliContext } from '../context/types';
import {
	extractOptionsFromConfig,
	isC15TOptions,
	isClientOptions,
	type LoadedConfig,
} from './get-config/config-extraction';
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

				logger.debug('Raw config loading result:', result);

				// Try to extract from result.config which should contain the module's exports
				if (result.config) {
					logger.debug('Trying to extract config from result.config');
					options = extractOptionsFromConfig(
						result.config as unknown as LoadedConfig
					);
				}

				// Validate loaded config
				if (options) {
					logger.debug('Extracted config:', options);

					if (isC15TOptions(options) || isClientOptions(options)) {
						logger.debug('Configuration validated successfully.');
						return options;
					}

					logger.debug('Loaded config does not match expected schema');
				} else {
					logger.debug('No configuration extracted from loaded file');
				}

				// Log the raw loaded config for debugging
				logger.debug('Raw loaded configuration:', result);

				// Fall through to broader search if manual load fails
				return null;
			} catch (error) {
				// Log but continue searching, don't rethrow
				logger.debug('Error loading config from explicit path:', error);

				// Try to load the module directly as a fallback
				try {
					logger.debug(`Trying to require module directly: ${foundConfigPath}`);
					// Using dynamic import since we're in an ES module context
					const importedModule = await import(foundConfigPath);
					logger.debug('Directly imported module:', importedModule);

					// Check if the module exports match our expected patterns
					const extracted = extractOptionsFromConfig(importedModule);
					if (
						extracted &&
						(isC15TOptions(extracted) || isClientOptions(extracted))
					) {
						logger.debug('Found valid config through direct import');
						return extracted;
					}
				} catch (importError) {
					logger.debug('Error importing module directly:', importError);
				}

				// Fall through to broader search if manual load fails
				return null;
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
