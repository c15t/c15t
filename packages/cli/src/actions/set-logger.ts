import type { Logger } from '@c15t/backend/pkgs/logger';
import { parseCliArgs } from '~/context/parser';
import type { CliCommand, ParsedArgs } from '~/context/types';
import {
	type LogLevel,
	createCliLogger,
	validLogLevels,
} from '../utils/logger';

export interface CliContext {
	logger: Logger;
	flags: ParsedArgs['parsedFlags']; // Use the type from ParsedArgs
	commandName: string | undefined;
	commandArgs: string[];
	cwd: string;
}

/**
 * Parses arguments, creates the logger, and returns the application context.
 *
 * @param rawArgs - The raw command line arguments (process.argv.slice(2)).
 * @param cwd - The current working directory (process.cwd()).
 * @returns The CLI context object.
 */
export function createCliContext(
	rawArgs: string[],
	cwd: string,
	commands: CliCommand[]
): CliContext {
	// 1. Parse Arguments
	// TODO: Move parseCliArgs here or ensure it's imported correctly
	const { commandName, commandArgs, parsedFlags } = parseCliArgs(
		rawArgs,
		commands
	);

	// 2. Determine Log Level
	let desiredLogLevel: LogLevel = 'info'; // Default level
	const levelArg = parsedFlags.logger;

	if (typeof levelArg === 'string') {
		if (validLogLevels.includes(levelArg as LogLevel)) {
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

	// 3. Create Logger instance
	const logger = createCliLogger(desiredLogLevel);

	// 4. Log initialization (optional)
	logger.debug(`Logger initialized with level: ${desiredLogLevel}`);

	// 5. Return Context
	return {
		logger,
		flags: parsedFlags,
		commandName,
		commandArgs,
		cwd,
	};
}

// Remove old configureLogger if it exists
