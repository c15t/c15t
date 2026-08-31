/**
 * CLI Argument Parser
 *
 * Parses command line arguments into structured flags, command name, and command args.
 */

import * as p from '@clack/prompts';

import type { CliCommand, CliFlag, ParsedArgs } from '../types';
import { formatLogMessage } from './logger';

// --- Global Flags ---
export const globalFlags: CliFlag[] = [
	{
		description: 'Show this help message',
		expectsValue: false,
		names: ['--help', '-h'],
		type: 'special',
	},
	{
		description: 'Show the CLI version',
		expectsValue: false,
		names: ['--version', '-v'],
		type: 'special',
	},
	{
		defaultValue: 'info',
		description: 'Set log level (error, warn, info, debug)',
		expectsValue: true,
		names: ['--logger'],
		type: 'string',
	},
	{
		description: 'Specify path to configuration file',
		expectsValue: true,
		names: ['--config'],
		type: 'string',
	},
	{
		defaultValue: false,
		description: 'Skip confirmation prompts',
		expectsValue: false,
		names: ['-y', '--yes'],
		type: 'boolean',
	},
	{
		defaultValue: false,
		description: 'Disable telemetry data collection',
		expectsValue: false,
		names: ['--no-telemetry'],
		type: 'boolean',
	},
	{
		defaultValue: false,
		description: 'Enable debug mode for telemetry',
		expectsValue: false,
		names: ['--telemetry-debug'],
		type: 'boolean',
	},
	{
		defaultValue: false,
		description: 'Force operation even if files exist',
		expectsValue: false,
		names: ['--force'],
		type: 'boolean',
	},
];

/**
 * Get the primary name for a flag (without dashes)
 */
const getPrimaryFlagName = function getPrimaryFlagName(flag: CliFlag): string {
	const firstName = flag.names[0] || '';
	return firstName.replace(/^--?/u, '');
};

/**
 * Parse raw command line arguments into structured format
 */
export const parseCliArgs = function parseCliArgs(
	rawArgs: string[],
	commands: CliCommand[]
): ParsedArgs {
	const parsedFlags: Record<string, string | boolean | undefined> = {};
	const potentialCommandArgs: string[] = [];
	// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
	let commandName: string | undefined;
	const commandArgs: string[] = [];

	// Initialize flags with default values
	for (const flag of globalFlags) {
		const primaryName = getPrimaryFlagName(flag);
		if (primaryName) {
			if (flag.type === 'boolean') {
				parsedFlags[primaryName] = flag.defaultValue ?? false;
			} else {
				parsedFlags[primaryName] = flag.defaultValue;
			}
		}
	}

	// Parse arguments
	for (let i = 0; i < rawArgs.length; i += 1) {
		const arg = rawArgs[i];
		if (typeof arg !== 'string') {
			continue;
		}

		let isFlag = false;

		// Check if this is a known flag
		for (const flag of globalFlags) {
			if (flag.names.includes(arg)) {
				const primaryName = getPrimaryFlagName(flag);
				if (!primaryName) {
					continue;
				}

				isFlag = true;

				if (flag.type === 'boolean') {
					parsedFlags[primaryName] = true;
				} else if (flag.expectsValue) {
					const nextArg = rawArgs[i + 1];
					if (nextArg && !nextArg.startsWith('-')) {
						parsedFlags[primaryName] = nextArg;
						// Skip the value
						i += 1;
					} else {
						p.log.warn(
							formatLogMessage(
								'warn',
								`Flag ${arg} expects a value, but none was provided`
							)
						);
					}
				} else {
					parsedFlags[primaryName] = true;
				}
				break;
			}
		}

		if (!isFlag) {
			potentialCommandArgs.push(arg);
		}
	}

	// Find the command name from potential args
	commandName = potentialCommandArgs.find((arg) =>
		commands.some((cmd) => cmd.name === arg)
	);

	// Everything else is a command argument
	for (const arg of potentialCommandArgs) {
		if (arg !== commandName) {
			commandArgs.push(arg);
		}
	}

	return { commandArgs, commandName, parsedFlags };
};

/**
 * Format help text for a flag
 */
export const formatFlagHelp = function formatFlagHelp(flag: CliFlag): string {
	const names = flag.names.join(', ');
	const valueHint = flag.expectsValue ? ' <value>' : '';
	return `  ${names}${valueHint}\t${flag.description}`;
};

/**
 * Generate help text for all global flags
 */
export const generateFlagsHelp = function generateFlagsHelp(): string {
	return globalFlags.map(formatFlagHelp).join('\n');
};

/**
 * Check if a specific flag is set
 */
export const hasFlag = function hasFlag(
	flags: ParsedArgs['parsedFlags'],
	name: string
): boolean {
	return flags[name] === true;
};

/**
 * Get a flag value
 */
export const getFlagValue = function getFlagValue(
	flags: ParsedArgs['parsedFlags'],
	name: string
): string | undefined {
	const value = flags[name];
	return typeof value === 'string' ? value : undefined;
};

/**
 * Parse subcommand from command args
 */
export const parseSubcommand = function parseSubcommand(
	args: string[],
	subcommands: CliCommand[]
): { subcommand: CliCommand | undefined; remainingArgs: string[] } {
	// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
	const subcommandName = args[0];
	const subcommand = subcommands.find((cmd) => cmd.name === subcommandName);

	if (subcommand) {
		return {
			remainingArgs: args.slice(1),
			subcommand,
		};
	}

	return {
		remainingArgs: args,
		subcommand: undefined,
	};
};
