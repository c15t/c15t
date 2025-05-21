import * as p from '@clack/prompts';
import { formatLogMessage } from '~/utils/logger';
import type { CliCommand, CliFlag, ParsedArgs } from './types';
// Define flags within the parser module
export const globalFlags: CliFlag[] = [
	{
		names: ['--help', '-h'],
		description: 'Show this help message.',
		type: 'special',
		expectsValue: false,
	},
	{
		names: ['--version', '-v'],
		description: 'Show the CLI version.',
		type: 'special',
		expectsValue: false,
	},
	{
		names: ['--logger'],
		description: 'Set log level (fatal, error, warn, info, debug).',
		type: 'string',
		expectsValue: true,
	},
	{
		names: ['--config'],
		description: 'Specify path to configuration file.',
		type: 'string',
		expectsValue: true,
	},
	{
		names: ['-y'],
		description: 'Skip confirmation prompts (use with caution).',
		type: 'boolean',
		expectsValue: false,
	},
	{
		names: ['--no-telemetry'],
		description: 'Disable telemetry data collection.',
		type: 'boolean',
		expectsValue: false,
	},
	{
		names: ['--telemetry-debug'],
		description:
			'Enable debug mode for telemetry (shows detailed telemetry logs).',
		type: 'boolean',
		expectsValue: false,
	},
];

/**
 * Parses raw command line arguments into structured flags, command name, and command args.
 *
 * @param rawArgs - Raw arguments from process.argv.slice(2).
 * @param commands - The list of available CLI commands (needed to identify command name).
 * @returns A ParsedArgs object.
 */
export function parseCliArgs(
	rawArgs: string[],
	commands: CliCommand[]
): ParsedArgs {
	const parsedFlags: Record<string, string | boolean | undefined> = {};
	const potentialCommandArgsAndUndefined: (string | undefined)[] = [];
	let commandName: string | undefined;
	const commandArgs: string[] = [];

	// Initialize flags
	for (const flag of globalFlags) {
		const primaryName = flag.names[0]?.replace(/^--/, '').replace(/^-/, '');
		if (primaryName) {
			parsedFlags[primaryName] = flag.type === 'boolean' ? false : undefined;
		}
	}

	// First pass: Identify flags and their values
	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];
		if (typeof arg !== 'string') {
			continue;
		}
		let argIsFlagOrValue = false;
		for (const flag of globalFlags) {
			if (flag.names.includes(arg)) {
				const primaryName = flag.names[0]?.replace(/^--/, '').replace(/^-/, '');
				if (primaryName) {
					argIsFlagOrValue = true;
					if (flag.type === 'boolean') {
						parsedFlags[primaryName] = true;
					} else if (flag.expectsValue) {
						const nextArg = rawArgs[i + 1];
						if (nextArg && !nextArg.startsWith('-')) {
							parsedFlags[primaryName] = nextArg;
							i++;
						} else {
							p.log.warn(
								formatLogMessage(
									'warn',
									`Flag ${arg} expects a value, but none was found or the next item is a flag.`
								)
							);
						}
					} else {
						parsedFlags[primaryName] = true;
					}
				}
				break;
			}
		}
		if (!argIsFlagOrValue) {
			potentialCommandArgsAndUndefined.push(arg);
		}
	}

	const potentialCommandArgs = potentialCommandArgsAndUndefined.filter(
		(arg): arg is string => typeof arg === 'string'
	);

	commandName = potentialCommandArgs.find((arg) =>
		commands.some((cmd) => cmd.name === arg)
	);

	for (const arg of potentialCommandArgs) {
		if (arg !== commandName) {
			commandArgs.push(arg);
		}
	}

	return { commandName, commandArgs, parsedFlags };
}
