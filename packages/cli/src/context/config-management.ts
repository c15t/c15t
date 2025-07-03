import fs from 'node:fs';
import path from 'node:path';
import type { C15TOptions, C15TPlugin } from '@c15t/backend';
import { getConfig } from '../actions/get-config';
import type { CliContext } from './types';

/**
 * Creates configuration management utilities for the CLI context
 */
export function createConfigManagement(context: CliContext) {
	const { logger, error } = context;

	return {
		/**
		 * Load configuration, returns null if not found
		 */
		loadConfig: async (): Promise<C15TOptions<C15TPlugin[]> | null> => {
			logger.debug('Attempting to load configuration...');

			try {
				const configResult = await getConfig(context);
				const config = configResult ?? null;
				logger.debug('Config loading result:', config);

				if (config) {
					logger.debug('Configuration loaded successfully.');
				} else {
					logger.debug('No configuration found.');
				}

				return config;
			} catch (err: unknown) {
				return error.handleError(err, 'Error loading configuration');
			}
		},

		/**
		 * Load configuration and throw an error if not found
		 */
		requireConfig: async (): Promise<C15TOptions<C15TPlugin[]>> => {
			const config = await context.config.loadConfig();

			if (!config) {
				return error.handleError(
					new Error('Configuration required but not found'),
					'Missing required configuration'
				);
			}

			return config;
		},

		/**
		 * Extract path aliases from tsconfig.json or jsconfig.json
		 */
		getPathAliases: (configDir?: string): Record<string, string> | null => {
			const cwd = configDir || context.cwd;
			const tsConfigPath = path.join(cwd, 'tsconfig.json');
			const jsConfigPath = path.join(cwd, 'jsconfig.json');

			// Try tsconfig first, then jsconfig
			const configPath = fs.existsSync(tsConfigPath)
				? tsConfigPath
				: fs.existsSync(jsConfigPath)
					? jsConfigPath
					: null;

			if (!configPath) {
				return null;
			}

			try {
				return extractAliasesFromConfigFile(context, configPath, cwd);
			} catch (extractError) {
				logger.warn(
					`Error extracting path aliases from ${configPath}:`,
					extractError
				);
				return null;
			}
		},
	};
}

/**
 * Strip JSON comments from a string for safe parsing
 */
function stripJsonComments(jsonString: string): string {
	return jsonString
		.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) =>
			g ? '' : m
		)
		.replace(/,(?=\s*[}\]])/g, '');
}

/**
 * Extract path aliases from a TypeScript or JavaScript config file
 */
function extractAliasesFromConfigFile(
	context: CliContext,
	configPath: string,
	cwd: string
): Record<string, string> | null {
	try {
		const configContent = fs.readFileSync(configPath, 'utf8');
		const strippedConfigContent = stripJsonComments(configContent);
		const config = JSON.parse(strippedConfigContent);
		const { paths = {}, baseUrl = '.' } = config.compilerOptions || {};

		const result: Record<string, string> = {};
		const obj = Object.entries(paths) as [string, string[]][];

		for (const [alias, aliasPaths] of obj) {
			for (const aliasedPath of aliasPaths) {
				const resolvedBaseUrl = path.join(cwd, baseUrl);
				const finalAlias = alias.slice(-1) === '*' ? alias.slice(0, -1) : alias;
				const finalAliasedPath =
					aliasedPath.slice(-1) === '*'
						? aliasedPath.slice(0, -1)
						: aliasedPath;

				result[finalAlias || ''] = path.join(resolvedBaseUrl, finalAliasedPath);
			}
		}

		// Add SvelteKit env modules if applicable
		if (hasSvelteKit(cwd)) {
			addSvelteKitEnvModules(result);
		}

		return result;
	} catch (error) {
		context.logger.warn(`Error parsing config file ${configPath}`, error);
		return null;
	}
}

/**
 * Check if the project is using SvelteKit
 */
function hasSvelteKit(cwd: string): boolean {
	try {
		const packageJsonPath = path.join(cwd, 'package.json');
		if (!fs.existsSync(packageJsonPath)) return false;

		const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
		const deps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		return '@sveltejs/kit' in deps;
	} catch {
		return false;
	}
}

/**
 * Add SvelteKit environment modules to path aliases
 */
function addSvelteKitEnvModules(aliases: Record<string, string>): void {
	// Add common SvelteKit environment module aliases
	aliases['$app/'] = '$app/';
	aliases['$lib/'] = '$lib/';
	aliases['$env/'] = '$env/';
	aliases['$service-worker'] = '$service-worker';
}
