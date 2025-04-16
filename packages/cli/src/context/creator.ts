import {
	type LogLevel,
	createCliLogger,
	validLogLevels,
} from '../utils/logger';
import { createConfigManagement } from './config-management';
import { createErrorHandlers } from './error-handlers';
import { createFileSystem } from './file-system';
import { parseCliArgs } from './parser';
import type { CliCommand, CliContext, } from './types';
import { createUserInteraction } from './user-interaction';

/**
 * Parses arguments, creates the logger, and returns the application context.
 *
 * @param rawArgs - The raw command line arguments (process.argv.slice(2)).
 * @param cwd - The current working directory (process.cwd()).
 * @param commands - The list of available CLI commands.
 * @returns The CLI context object.
 */
export function createCliContext(
	rawArgs: string[],
	cwd: string,
	commands: CliCommand[],
): CliContext {
	const { commandName, commandArgs, parsedFlags } = parseCliArgs(
		rawArgs,
		commands,
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

	// Add config management
	context.config = createConfigManagement(context);

	// Add file system utilities
	context.fs = createFileSystem(context);

	logger.debug('CLI context fully initialized with all utilities');

	return context;
}
