import * as p from '@clack/prompts';

import { formatLogMessage } from '~/utils/logger';

import type { CliCommand, CliFlag, ParsedArgs } from './types';
// Define flags within the parser module
export const globalFlags: CliFlag[] = [
	{
		description: 'Show this help message.',
		expectsValue: false,
		names: ['--help', '-h'],
		type: 'special',
	},
	{
		description: 'Show the CLI version.',
		expectsValue: false,
		names: ['--version', '-v'],
		type: 'special',
	},
	{
		description: 'Set log level (fatal, error, warn, info, debug).',
		expectsValue: true,
		names: ['--logger'],
		type: 'string',
	},
	{
		description: 'Specify path to configuration file.',
		expectsValue: true,
		names: ['--config'],
		type: 'string',
	},
	{
		description: 'Skip confirmation prompts (use with caution).',
		expectsValue: false,
		names: ['-y', '--yes'],
		type: 'boolean',
	},
	{
		description: 'Disable telemetry data collection.',
		expectsValue: false,
		names: ['--no-telemetry'],
		type: 'boolean',
	},
	{
		description:
			'Enable debug mode for telemetry (shows detailed telemetry logs).',
		expectsValue: false,
		names: ['--telemetry-debug'],
		type: 'boolean',
	},
];

/**
 * Parses raw command line arguments into structured flags, command name, and command args.
 *
 * @param rawArgs - Raw arguments from process.argv.slice(2).
 * @param commands - The list of available CLI commands (needed to identify command name).
 * @returns A ParsedArgs object.
 */
export const parseCliArgs = function parseCliArgs(
	rawArgs: string[],
	commands: CliCommand[]
): ParsedArgs {
	const parsedFlags: Record<string, string | boolean | undefined> = {};
	const potentialCommandArgsAndUndefined: (string | undefined)[] = [];
	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let commandName: string | undefined;
	const commandArgs: string[] = [];

	// Initialize flags
	for (const flag of globalFlags) {
		const primaryName = flag.names[0]?.replace(/^--/u, '').replace(/^-/u, '');
		if (primaryName) {
			parsedFlags[primaryName] = flag.type === 'boolean' ? false : undefined;
		}
	}

	// First pass: Identify flags and their values
	for (let i = 0; i < rawArgs.length; i += 1) {
		const arg = rawArgs[i];
		if (typeof arg !== 'string') {
			continue;
		}
		let argIsFlagOrValue = false;
		for (const flag of globalFlags) {
			if (flag.names.includes(arg)) {
				const primaryName = flag.names[0]
					?.replace(/^--/u, '')
					.replace(/^-/u, '');
				if (primaryName) {
					argIsFlagOrValue = true;
					if (flag.type === 'boolean') {
						parsedFlags[primaryName] = true;
					} else if (flag.expectsValue) {
						const nextArg = rawArgs[i + 1];
						if (nextArg && !nextArg.startsWith('-')) {
							parsedFlags[primaryName] = nextArg;
							i += 1;
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

	return { commandArgs, commandName, parsedFlags };
};
