/**
 * CLI Context Creation
 *
 * Creates the main CLI context object that is passed to all commands.
 * Contains logger, telemetry, error handlers, and detected environment info.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import * as p from '@clack/prompts';
import { loadConfig } from 'c12';
import { detectFramework, detectProjectRoot } from '../detection/framework';
import { detectPackageManager } from '../detection/package-manager';
import type { CliContext, PackageInfo, ParsedArgs } from '../types';
import { CliError, createErrorHandlers } from './errors';
import { createCliLogger, LOG_LEVELS, type LogLevel } from './logger';
import { createTelemetry, TelemetryEventName } from './telemetry';

// --- Context Options ---
export interface CreateContextOptions {
	/** Raw CLI arguments */
	args: ParsedArgs;
	/** Current working directory */
	cwd?: string;
	/** Skip environment detection (for testing) */
	skipDetection?: boolean;
}

// --- Package Info Helpers ---

/**
 * Get the CLI package.json info
 */
function getCliPackageInfo(): PackageInfo {
	// This is injected during build or read from package.json
	return {
		name: '@c15t/cli',
		version: '2.0.0',
	};
}

/**
 * Get the project's package.json info
 */
async function getProjectPackageInfo(
	projectRoot: string
): Promise<PackageInfo> {
	try {
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const content = await fs.readFile(packageJsonPath, 'utf-8');
		return JSON.parse(content) as PackageInfo;
	} catch {
		return { name: 'unknown', version: '0.0.0' };
	}
}

// --- Config Loading ---

/**
 * Load c15t configuration from the project
 */
async function loadProjectConfig(
	projectRoot: string,
	configPath?: string
): Promise<unknown | null> {
	try {
		const { config } = await loadConfig({
			name: 'c15t',
			cwd: projectRoot,
			configFile: configPath,
		});
		return config;
	} catch {
		return null;
	}
}

// --- Path Alias Resolution ---

/**
 * Get path aliases from tsconfig.json or jsconfig.json
 */
function getPathAliases(
	projectRoot: string,
	configPath?: string
): Record<string, string> | null {
	try {
		const configFile = configPath || path.join(projectRoot, 'tsconfig.json');
		// This would need to read and parse the tsconfig
		// For now, return null - can be implemented later
		return null;
	} catch {
		return null;
	}
}

// --- Context Creation ---

/**
 * Create the CLI context
 */
export async function createCliContext(
	options: CreateContextOptions
): Promise<CliContext> {
	const { args, cwd = process.cwd(), skipDetection = false } = options;
	const { parsedFlags, commandName, commandArgs } = args;

	// Determine log level
	const logLevelFlag = parsedFlags.logger;
	const logLevel: LogLevel =
		typeof logLevelFlag === 'string' &&
		LOG_LEVELS.includes(logLevelFlag as LogLevel)
			? (logLevelFlag as LogLevel)
			: 'info';

	// Create logger
	const logger = createCliLogger(logLevel);

	// Create telemetry
	const telemetry = createTelemetry({
		disabled: parsedFlags['no-telemetry'] === true,
		debug: parsedFlags['telemetry-debug'] === true,
		logger,
	});

	// Create error handlers
	const errorHandlers = createErrorHandlers(logger, telemetry);

	// Detect project root
	let projectRoot = cwd;
	if (!skipDetection) {
		projectRoot = await detectProjectRoot(cwd, logger);
	}

	// Detect framework
	const framework = skipDetection
		? {
				framework: null,
				frameworkVersion: null,
				pkg: 'c15t' as const,
				hasReact: false,
				reactVersion: null,
				tailwindVersion: null,
			}
		: await detectFramework(projectRoot, logger);

	// Detect package manager
	const packageManager = skipDetection
		? {
				name: 'npm' as const,
				installCommand: 'npm install',
				addCommand: 'npm install',
				runCommand: 'npm run',
				execCommand: 'npx',
			}
		: await detectPackageManager(projectRoot, logger);

	// Track CLI invocation
	telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
		command: commandName || 'interactive',
		framework: framework.framework || 'unknown',
		packageManager: packageManager.name,
	});

	// Create the context
	const context: CliContext = {
		logger,
		flags: parsedFlags,
		commandName,
		commandArgs,
		cwd,
		projectRoot,
		framework,
		packageManager,
		telemetry,
		error: errorHandlers,

		// Config management
		config: {
			loadConfig: async () => {
				const configPath =
					typeof parsedFlags.config === 'string'
						? parsedFlags.config
						: undefined;
				return loadProjectConfig(projectRoot, configPath);
			},
			requireConfig: async () => {
				const config = await loadProjectConfig(projectRoot);
				if (!config) {
					throw new CliError('CONFIG_NOT_FOUND');
				}
				return config;
			},
			getPathAliases: (configPath?: string) =>
				getPathAliases(projectRoot, configPath),
		},

		// File system utilities
		fs: {
			getPackageInfo: () => getCliPackageInfo(),
			exists: async (filePath: string) => {
				try {
					await fs.access(filePath);
					return true;
				} catch {
					return false;
				}
			},
			read: async (filePath: string) => {
				return fs.readFile(filePath, 'utf-8');
			},
			write: async (filePath: string, content: string) => {
				await fs.writeFile(filePath, content, 'utf-8');
			},
			mkdir: async (dirPath: string) => {
				await fs.mkdir(dirPath, { recursive: true });
			},
		},

		// User interaction
		confirm: async (message: string, initialValue = true): Promise<boolean> => {
			// Skip confirmation if -y flag is set
			if (parsedFlags.y === true || parsedFlags.yes === true) {
				return true;
			}

			const result = await p.confirm({
				message,
				initialValue,
			});

			if (p.isCancel(result)) {
				errorHandlers.handleCancel('Confirmation cancelled');
			}

			return result as boolean;
		},
	};

	return context;
}

/**
 * Create a minimal context for testing
 */
export function createTestContext(
	overrides: Partial<CliContext> = {}
): CliContext {
	const logger = createCliLogger('error');
	const telemetry = createTelemetry({ disabled: true });
	const errorHandlers = createErrorHandlers(logger, telemetry);

	return {
		logger,
		flags: {},
		commandName: undefined,
		commandArgs: [],
		cwd: process.cwd(),
		projectRoot: process.cwd(),
		framework: {
			framework: null,
			frameworkVersion: null,
			pkg: 'c15t',
			hasReact: false,
			reactVersion: null,
			tailwindVersion: null,
		},
		packageManager: {
			name: 'npm',
			installCommand: 'npm install',
			addCommand: 'npm install',
			runCommand: 'npm run',
			execCommand: 'npx',
		},
		telemetry,
		error: errorHandlers,
		config: {
			loadConfig: async () => null,
			requireConfig: async () => {
				throw new CliError('CONFIG_NOT_FOUND');
			},
			getPathAliases: () => null,
		},
		fs: {
			getPackageInfo: () => ({ name: 'test', version: '0.0.0' }),
			exists: async () => false,
			read: async () => '',
			write: async () => {},
			mkdir: async () => {},
		},
		confirm: async () => true,
		...overrides,
	};
}
