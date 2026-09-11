import path from 'node:path';

import { loadConfig } from 'c12';

import { CliError } from '../core/errors';
import { packageInfo } from '../package-info';
import { createCliLogger, validLogLevels } from '../utils/logger';
import type { CliLogger, LogLevel } from '../utils/logger';
import { createTelemetry } from '../utils/telemetry';
import { createErrorHandlers } from './error-handlers';
import { createFileSystem } from './file-system';
import { detectFramework, detectProjectRoot } from './framework-detection';
import { detectPackageManager } from './package-manager-detection';
import { parseCliArgs } from './parser';
import type { CliCommand, CliContext, ParsedArgs } from './types';
import { createUserInteraction } from './user-interaction';

export interface CreateContextOptions {
	parsed?: ParsedArgs;
	logger?: CliLogger;
	write?: (line: string) => void;
	interactive?: boolean;
	telemetry?: boolean;
}

/** Create the command context without changing cwd or installing process handlers. */
export const createCliContext = async (
	rawArgs: string[],
	cwd: string,
	commands: CliCommand[],
	options: CreateContextOptions = {}
): Promise<CliContext> => {
	const parsed = options.parsed ?? parseCliArgs(rawArgs, commands);
	const flags = { ...parsed.parsedFlags };
	const interactive =
		(options.interactive ??
			Boolean(process.stdin.isTTY && process.stdout.isTTY)) &&
		flags['non-interactive'] !== true &&
		flags.json !== true;
	flags['non-interactive'] = !interactive;
	const levelArg = flags.logger;
	if (
		typeof levelArg === 'string' &&
		!validLogLevels.includes(levelArg as LogLevel)
	) {
		throw new CliError('FLAG_INVALID', {
			details: `Unknown log level: ${levelArg}`,
		});
	}
	const logger =
		options.logger ??
		createCliLogger((levelArg as LogLevel | undefined) ?? 'info', {
			interactive,
			write:
				options.write ??
				(flags.json === true
					? (line: string) => {
							process.stderr.write(`${line}\n`);
						}
					: undefined),
		});
	const needsProject = [
		'setup',
		'generate',
		'codemods',
		'self-host',
		'skills',
	].includes(parsed.commandName ?? '');
	const projectRoot = needsProject ? await detectProjectRoot(cwd, logger) : cwd;
	const framework = needsProject
		? await detectFramework(projectRoot, logger)
		: {
				framework: null,
				frameworkVersion: null,
				hasReact: false,
				pkg: 'c15t' as const,
				reactVersion: null,
				tailwindVersion: null,
			};
	const packageManager = needsProject
		? await detectPackageManager(projectRoot, logger, interactive)
		: {
				name: 'npm' as const,
				version: null,
			};
	const telemetry = createTelemetry({
		debug: flags['telemetry-debug'] === true,
		defaultProperties: {
			cliVersion: packageInfo.version,
			entryCommand: parsed.commandName ?? 'interactive',
		},
		disabled: options.telemetry === false || flags['no-telemetry'] === true,
		logger,
	});
	const error = createErrorHandlers({ telemetry });
	const readConfig = async () => {
		const result = await loadConfig({
			configFile:
				typeof flags.config === 'string'
					? path.resolve(cwd, flags.config)
					: undefined,
			cwd: projectRoot,
			name: 'c15t',
		});
		return result.config ?? null;
	};
	return {
		...parsed,
		config: {
			getPathAliases: () => null,
			loadConfig: readConfig,
			requireConfig: async () => {
				const config = await readConfig();
				if (!config) {
					throw new CliError('CONFIG_NOT_FOUND');
				}
				return config;
			},
		},
		confirm: createUserInteraction({ error, flags }).confirm,
		cwd,
		error,
		flags,
		framework,
		fs: createFileSystem(),
		logger,
		packageManager,
		projectRoot,
		telemetry,
	};
};
