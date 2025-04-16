import fs from 'node:fs';
import path from 'node:path';
import babelPresetReact from '@babel/preset-react';
import babelPresetTypescript from '@babel/preset-typescript';
import type { C15TOptions } from '@c15t/backend';
import { DoubleTieError } from '@c15t/backend/pkgs/results';
import { loadConfig } from 'c12';

import { addSvelteKitEnvModules } from './add-svelte-kit-env-modules';
import logger from './logger';

/**
 * List of possible config file names and locations to search
 */
const configFileNames = ['c15t', 'consent', 'cmp'];

const extensions = [
	'.js',
	'.jsx',
	'.ts',
	'.tsx',
	'.cjs',
	'.cts',
	'.mjs',
	'.mts',
	'.server.cjs',
	'.server.cts',
	'.server.js',
	'.server.jsx',
	'.server.mjs',
	'.server.mts',
	'.server.ts',
	'.server.tsx',
];

// Generate all possible file combinations
let possiblePaths = configFileNames.flatMap((name) =>
	extensions.map((ext) => `${name}${ext}`)
);

// Define all directories to search in
const directories = [
	'',
	'lib/server/',
	'server/',
	'lib/',
	'utils/',
	'config/',
	'src/',
	'app/',
];

// Combine directories with possible paths
possiblePaths = directories.flatMap((dir) =>
	possiblePaths.map((file) => `${dir}${file}`)
);

// Also search for config files in package subdirectories (for monorepos)
const monorepoSubdirs = ['packages/*', 'apps/*'];

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
 * Extract path aliases from tsconfig.json
 */
function getPathAliases(cwd: string): Record<string, string> | null {
	const tsConfigPath = path.join(cwd, 'tsconfig.json');
	if (!fs.existsSync(tsConfigPath)) {
		// Also try searching for jsconfig.json
		const jsConfigPath = path.join(cwd, 'jsconfig.json');
		if (!fs.existsSync(jsConfigPath)) {
			return null;
		}
		// Use jsconfig.json instead
		return extractAliasesFromConfigFile(jsConfigPath, cwd);
	}
	return extractAliasesFromConfigFile(tsConfigPath, cwd);
}

/**
 * Extract path aliases from a TypeScript or JavaScript config file
 */
function extractAliasesFromConfigFile(
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
		addSvelteKitEnvModules(result);
		return result;
	} catch (error) {
		logger.warn(`Error parsing config file ${configPath}`, error);
		return null;
	}
}

/**
 * Get Jiti options for transpiling TypeScript/JSX
 */
const jitiOptions = (cwd: string) => {
	const alias = getPathAliases(cwd) || {};
	return {
		transformOptions: {
			babel: {
				presets: [
					[
						babelPresetTypescript,
						{
							isTSX: true,
							allExtensions: true,
						},
					],
					[babelPresetReact, { runtime: 'automatic' }],
				],
			},
		},
		extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'],
		alias,
	};
};

type config = {
	c15t: {
		options: C15TOptions;
	};
	default?: {
		options: C15TOptions;
	};
	c15tInstance?: {
		options: C15TOptions;
	};
	consent?: {
		options: C15TOptions;
	};
	instance?: {
		options: C15TOptions;
	};
	config: {
		options: C15TOptions;
	};
};
/**
 * Extract c15t options from config object
 * Looks for various common export names for the c15t instance
 */
function extractOptionsFromConfig(config: config): C15TOptions | null {
	// First check for direct exports of the c15t instance
	if (config.c15t && typeof config.c15t === 'function') {
		return config.c15t;
	}
	if (config.default && typeof config.default === 'function') {
		return config.default;
	}
	if (config.c15tInstance && typeof config.c15tInstance === 'function') {
		return config.c15tInstance;
	}
	if (config.consent && typeof config.consent === 'function') {
		return config.consent;
	}

	// Then check for options objects
	return (
		config.c15t?.options ||
		config.default?.options ||
		config.c15tInstance?.options ||
		config.instance?.options ||
		config.consent?.options ||
		config.config?.options ||
		// Also check for direct exports of options objects
		(config.default &&
		typeof config.default === 'object' &&
		'appName' in config.default
			? config.default
			: null) ||
		// Finally check for direct exports of the instance
		(config.c15t && typeof config.c15t === 'object' && 'appName' in config.c15t
			? config.c15t
			: null) ||
		null
	);
}

/**
 * Find all directories that match the glob pattern
 */
function findDirectories(cwd: string, patterns: string[]): string[] {
	const results: string[] = [];

	for (const pattern of patterns) {
		// Handle glob patterns by expanding the star
		if (pattern.includes('*')) {
			const [prefix] = pattern.split('*');
			if (prefix) {
				const basePath = path.join(cwd, prefix);

				try {
					if (fs.existsSync(basePath)) {
						const entries = fs.readdirSync(basePath, { withFileTypes: true });
						for (const entry of entries) {
							if (entry.isDirectory()) {
								results.push(path.join(prefix, entry.name));
							}
						}
					}
				} catch {
					// Ignore errors and continue
				}
			}
		} else if (
			fs.existsSync(path.join(cwd, pattern)) &&
			fs.statSync(path.join(cwd, pattern)).isDirectory()
		) {
			results.push(pattern);
		}
	}

	return results;
}

/**
 * Validate the config file
 */
function validateConfig(config: C15TOptions | null): boolean {
	if (!config) {
		return false;
	}

	// Basic validation - ensure minimal required properties exist
	// Can be expanded as needed
	return typeof config === 'object';
}

/**
 * Get the c15t configuration
 */
export async function getConfig({
	cwd,
	configPath,
}: {
	cwd: string;
	configPath?: string;
}) {
	// Store original log functions
	const originalLoggerError = logger.error;
	const originalLoggerInfo = logger.info;

	// Temporarily suppress logger during config search
	logger.error = () => undefined; // No-op
	logger.info = () => undefined; // No-op

	let result: C15TOptions | null = null;
	try {
		// Determine search paths, prioritizing explicit path if given
		const searchPaths = configPath ? [path.dirname(configPath)] : [cwd];
		const rcFile = configPath ? path.basename(configPath) : undefined;

		// Try loading from specified/standard locations
		const loaded = await loadConfig<config>({
			cwd: searchPaths[0],
			name: rcFile,
			configFile: rcFile ? undefined : configFileNames[0],
			rcFile: rcFile ? `.${rcFile}` : '.c15trc',
			jitiOptions: jitiOptions(cwd),
		});

		if (loaded.config) {
			const extractedOptions = extractOptionsFromConfig(loaded.config);
			if (validateConfig(extractedOptions)) {
				result = extractedOptions;
			}
		}

		// If still not found, try searching monorepo subdirectories
		if (!result) {
			const subdirs = findDirectories(cwd, monorepoSubdirs);
			for (const subdir of subdirs) {
				const subPath = path.join(cwd, subdir);
				const loadedSub = await loadConfig<config>({
					cwd: subPath,
					configFile: configFileNames[0],
					jitiOptions: jitiOptions(subPath),
				});
				if (loadedSub.config) {
					const extractedOptions = extractOptionsFromConfig(loadedSub.config);
					if (validateConfig(extractedOptions)) {
						result = extractedOptions;
						break; // Found it, stop searching
					}
				}
			}
		}
	} catch (error) {
		// Restore logger before handling the error
		logger.error = originalLoggerError;
		logger.info = originalLoggerInfo;

		// Log the actual loading error if one occurred
		originalLoggerError('Error during configuration loading:', error);
		throw new DoubleTieError(
			`Failed to load or parse c15t configuration. ${error instanceof Error ? `Reason: ${error.message}` : ''}`,
			{
				code: 'CONFIG_LOAD_ERROR',
				status: 500,
				category: 'CONFIG_LOAD_ERROR',
				cause: error instanceof Error ? error : undefined,
			}
		);
	} finally {
		// Ensure logger is always restored
		logger.error = originalLoggerError;
		logger.info = originalLoggerInfo;
	}

	return result; // Will be undefined if not found
}

export { possiblePaths };
