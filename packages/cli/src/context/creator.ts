import {
	createCliLogger,
	type LogLevel,
	validLogLevels,
} from '../utils/logger';
import { createTelemetry } from '../utils/telemetry';
import { createErrorHandlers } from './error-handlers';
import { createFileSystem } from './file-system';
import { detectFramework, detectProjectRoot } from './framework-detection';
import { detectPackageManager } from './package-manager-detection';
import { parseCliArgs } from './parser';
import type { CliCommand, CliContext } from './types';
import { createUserInteraction } from './user-interaction';

/**
 * Parses arguments, creates the logger, and returns the application context.
 *
 * @param rawArgs - The raw command line arguments (process.argv.slice(2)).
 * @param cwd - The current working directory (process.cwd()).
 * @param commands - The list of available CLI commands.
 * @returns The CLI context object.
 */
export async function createCliContext(
	rawArgs: string[],
	cwd: string,
	commands: CliCommand[]
): Promise<CliContext> {
	const { commandName, commandArgs, parsedFlags } = parseCliArgs(
		rawArgs,
		commands
	);

	let desiredLogLevel: LogLevel = 'info';
	const levelArg = parsedFlags.logger;

	if (typeof levelArg === 'string') {
		if ((validLogLevels as string[]).includes(levelArg)) {
			desiredLogLevel = levelArg as LogLevel;
		} else {
			console.warn(
				`[CLI Setup] Invalid log level '${levelArg}' provided via --logger. Using default 'info'.`
			);
		}
	} else if (levelArg === true) {
		console.warn(
			"[CLI Setup] --logger flag found but no level specified. Using default 'info'."
		);
	}

	const logger = createCliLogger(desiredLogLevel);
	logger.debug(`Logger initialized with level: ${desiredLogLevel}`);

	// Create the base context
	const baseContext: Partial<CliContext> = {
		logger,
		flags: parsedFlags,
		commandName,
		commandArgs,
		cwd,
	};

	// Create a self-referential context object
	const context = baseContext as CliContext;

	// Add error handlers
	context.error = createErrorHandlers(context);

	// Add user interaction helpers
	const userInteraction = createUserInteraction(context);
	context.confirm = userInteraction.confirm;

	// Add file system utilities
	context.fs = createFileSystem(context);

	// Detect project root, framework, and package manager
	context.projectRoot = await detectProjectRoot(cwd, logger);
	context.framework = await detectFramework(context.projectRoot, logger);
	context.packageManager = await detectPackageManager(
		context.projectRoot,
		logger
	);

	// Add telemetry, respecting the telemetry flag if present
	const telemetryDisabled = parsedFlags['no-telemetry'] === true;
	const telemetryDebug = parsedFlags['telemetry-debug'] === true;

	try {
		context.telemetry = createTelemetry({
			disabled: telemetryDisabled,
			debug: telemetryDebug,
			defaultProperties: {
				cliVersion: context.fs.getPackageInfo().version,
				framework: context.framework.framework ?? 'unknown',
				frameworkVersion: context.framework.frameworkVersion ?? 'unknown',
				packageManager: context.packageManager.name,
				packageManagerVersion: context.packageManager.version ?? 'unknown',
				hasReact: context.framework.hasReact,
				reactVersion: context.framework.reactVersion ?? 'unknown',
				package: context.framework.pkg ?? 'unknown',
			},
			logger: context.logger,
		});

		if (telemetryDisabled) {
			logger.debug('Telemetry is disabled by user preference');
		} else if (telemetryDebug) {
			logger.debug('Telemetry initialized with debug mode enabled');
		} else {
			logger.debug('Telemetry initialized');
		}
	} catch {
		// If telemetry initialization fails, create a disabled instance
		logger.warn(
			'Failed to initialize telemetry, continuing with telemetry disabled'
		);
		context.telemetry = createTelemetry({
			disabled: true,
			logger: context.logger,
		});
	}

	logger.debug('CLI context fully initialized with all utilities');

	return context;
}
