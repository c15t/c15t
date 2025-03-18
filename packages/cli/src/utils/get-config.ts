import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore
import babelPresetReact from '@babel/preset-react';
// @ts-ignore
import babelPresetTypescript from '@babel/preset-typescript';

import { DoubleTieError } from '@c15t/backend/pkgs/results';
import type { C15TOptions } from '@c15t/backend/pkgs/types';
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
			const [prefix, _] = pattern.split('*');
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
	// Track all found config files for better error reporting
	const foundPaths: string[] = [];
	const failedImports: string[] = [];

	try {
		let configFile: C15TOptions | null = null;

		// If a specific config path is provided, try to load it
		if (configPath) {
			const resolvedPath = path.join(cwd, configPath);

			try {
				if (!fs.existsSync(resolvedPath)) {
					throw new DoubleTieError(
						`Configuration file not found: ${resolvedPath}\nMake sure the path is correct and the file exists.`,
						{
							code: 'CONFIG_FILE_NOT_FOUND',
							status: 404,
							category: 'CONFIG_FILE_NOT_FOUND',
						}
					);
				}

				foundPaths.push(resolvedPath);

				const { config } = await loadConfig<config>({
					configFile: resolvedPath,
					dotenv: true,
					jitiOptions: jitiOptions(cwd),
				});

				configFile = extractOptionsFromConfig(config);

				if (!configFile) {
					throw new DoubleTieError(
						// biome-ignore lint/style/useTemplate: keep it split so its easier to read
						`Found config file at ${resolvedPath} but couldn't extract c15t options.\n` +
							`Make sure you're exporting c15t with one of these patterns:\n` +
							'- export const c15t = c15tInstance({...})\n' +
							'- export const consent = c15tInstance({...})\n' +
							'- export const c15tInstance = c15tInstance({...})\n' +
							'- export default c15tInstance({...})',
						{
							code: 'CONFIG_FILE_LOAD_ERROR',
							status: 500,
							category: 'CONFIG_FILE_LOAD_ERROR',
						}
					);
				}
			} catch (e) {
				// Check if file exists but imports failed
				if (fs.existsSync(resolvedPath)) {
					failedImports.push(resolvedPath);
					if (e instanceof DoubleTieError) {
						throw e; // Rethrow our own errors
					}
					throw new DoubleTieError(
						// biome-ignore lint/style/useTemplate: keep it split so its easier to read
						`Config file found at ${resolvedPath} but failed to load.\n` +
							'This usually happens because of import problems:\n' +
							'- Check for invalid import paths\n' +
							'- Ensure all dependencies are installed\n' +
							'- Verify path aliases in tsconfig.json\n\n' +
							`Error details: ${e instanceof Error ? e.message : String(e)}`,
						{
							code: 'CONFIG_FILE_LOAD_ERROR',
							status: 500,
							category: 'CONFIG_FILE_LOAD_ERROR',
							cause: e,
						}
					);
				}
				// Re-throw the error for the outer catch block to handle
				throw e;
			}
		}

		// If no config file was found or loaded, search through possible paths
		if (!configFile) {
			// Don't log this to the end user, it's an implementation detail
			// logger.debug('Searching for config in standard locations...');

			// Collect all directories to search in
			const searchDirs = [''];
			// Add monorepo subdirectories if they exist
			searchDirs.push(...findDirectories(cwd, monorepoSubdirs));

			// For each directory, try all possible config paths
			for (const dir of searchDirs) {
				for (const possiblePath of possiblePaths) {
					const configPath = path.join(dir, possiblePath);
					const fullPath = path.join(cwd, configPath);

					// Skip if file doesn't exist
					if (!fs.existsSync(fullPath)) {
						continue;
					}

					// Don't log every attempt, it's noisy
					foundPaths.push(fullPath);

					try {
						const { config } = await loadConfig<config>({
							configFile: configPath,
							jitiOptions: jitiOptions(cwd),
						});

						if (Object.keys(config).length > 0) {
							configFile = extractOptionsFromConfig(config);

							if (configFile && validateConfig(configFile)) {
								// Only log when we've successfully found and loaded a config
								logger.info(`✅ Using c15t config from ${fullPath}`);
								break; // Success!
							}
						}
					} catch (e) {
						// Special handling for server-only imports
						if (
							typeof e === 'object' &&
							e &&
							'message' in e &&
							typeof e.message === 'string' &&
							e.message.includes(
								'This module cannot be imported from a Client Component module'
							)
						) {
							throw new DoubleTieError(
								// biome-ignore lint/style/useTemplate: keep it split so its easier to read
								`Found config file at ${fullPath}, but it imports 'server-only'.\n` +
									`Please temporarily remove the 'server-only' import while using the CLI,\n` +
									'and you can add it back afterwards.',
								{
									code: 'SERVER_ONLY_IMPORT_DETECTED',
									status: 500,
									category: 'SERVER_ONLY_IMPORT_DETECTED',
								}
							);
						}

						// Track failed imports but continue searching
						failedImports.push(fullPath);
					}
				}

				if (configFile) {
					break;
				}
			}
		}

		// Simplify the error reporting when no config is found
		if (!configFile) {
			if (foundPaths.length > 0) {
				logger.error(
					`❌ Found ${foundPaths.length} potential config files, but couldn't load any of them:`
				);
				// Show the first few found paths (up to 3)
				for (const filePath of foundPaths.slice(0, 3)) {
					logger.error(`   - ${filePath}`);
				}
				if (foundPaths.length > 3) {
					logger.error(`   - ...and ${foundPaths.length - 3} more`);
				}
				if (failedImports.length > 0) {
					logger.error('\n❓ Common issues that prevent loading config files:');
					logger.error('   - Missing dependencies (check your package.json)');
					logger.error(
						'   - Import path issues (check your import statements)'
					);
					logger.error(
						'   - Path alias configuration (check your tsconfig.json)'
					);
					logger.error(
						"   - Export format (make sure you're exporting c15t, c15tInstance, consent, or default)"
					);
				}

				throw new DoubleTieError('Unable to load any c15t configuration file', {
					code: 'CONFIG_FILE_LOAD_ERROR',
					status: 500,
					category: 'CONFIG_FILE_LOAD_ERROR',
				});
			}

			logger.error(
				'❌ No c15t configuration files found in standard locations'
			);
			logger.info('\n📝 Create a c15t.ts file with your configuration:');
			logger.info(`
import { c15tInstance } from '@c15t/backend';

export const c15t = c15tInstance({
  appName: 'My App',
  basePath: '/api/c15t',
  // Add your configuration here
});
			`);

			throw new DoubleTieError(
				'No c15t config file found. Create a c15t.ts file or specify with --config',
				{
					code: 'CONFIG_FILE_NOT_FOUND',
					status: 404,
					category: 'CONFIG_FILE_NOT_FOUND',
				}
			);
		}

		return configFile;
	} catch (e) {
		if (
			typeof e === 'object' &&
			e &&
			'message' in e &&
			typeof e.message === 'string' &&
			e.message.includes(
				'This module cannot be imported from a Client Component module'
			)
		) {
			logger.error(
				'❌ Server-only import detected in config file\n' +
					"Please temporarily remove the 'server-only' import while using the CLI,\n" +
					'and you can add it back afterwards.'
			);
			process.exit(1);
		}

		if (e instanceof DoubleTieError) {
			logger.error(`❌ ${e.message}`);
		} else {
			logger.error(`❌ Couldn't read your c15t configuration`);
			logger.error(`   Error: ${e instanceof Error ? e.message : String(e)}`);
		}

		if (failedImports.length > 0) {
			logger.info(
				"\n💡 Tip: If you're having import issues, try running with verbose logging:"
			);
			logger.info('   DEBUG=c15t* npx c15t@latest <command>');
		}

		process.exit(1);
	}
}

export { possiblePaths };
