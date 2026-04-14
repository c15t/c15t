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
		names: ['--help', '-h'],
		description: 'Show this help message',
		type: 'special',
		expectsValue: false,
	},
	{
		names: ['--version', '-v'],
		description: 'Show the CLI version',
		type: 'special',
		expectsValue: false,
	},
	{
		names: ['--logger'],
		description: 'Set log level (error, warn, info, debug)',
		type: 'string',
		expectsValue: true,
		defaultValue: 'info',
	},
	{
		names: ['--config'],
		description: 'Specify path to configuration file',
		type: 'string',
		expectsValue: true,
	},
	{
		names: ['-y', '--yes'],
		description: 'Skip confirmation prompts',
		type: 'boolean',
		expectsValue: false,
		defaultValue: false,
	},
	{
		names: ['--no-telemetry'],
		description: 'Disable telemetry data collection',
		type: 'boolean',
		expectsValue: false,
		defaultValue: false,
	},
	{
		names: ['--telemetry-debug'],
		description: 'Enable debug mode for telemetry',
		type: 'boolean',
		expectsValue: false,
		defaultValue: false,
	},
	{
		names: ['--force'],
		description: 'Force operation even if files exist',
		type: 'boolean',
		expectsValue: false,
		defaultValue: false,
	},
];

/**
 * Get the primary name for a flag (without dashes)
 */
function getPrimaryFlagName(flag: CliFlag): string {
	const firstName = flag.names[0] || '';
	return firstName.replace(/^--?/, '');
}

/**
 * Parse raw command line arguments into structured format
 */
export function parseCliArgs(
	rawArgs: string[],
	commands: CliCommand[]
): ParsedArgs {
	const parsedFlags: Record<string, string | boolean | undefined> = {};
	const potentialCommandArgs: string[] = [];
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
	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];
		if (typeof arg !== 'string') {
			continue;
		}

		let isFlag = false;

		// Check if this is a known flag
		for (const flag of globalFlags) {
			if (flag.names.includes(arg)) {
				const primaryName = getPrimaryFlagName(flag);
				if (!primaryName) continue;

				isFlag = true;

				if (flag.type === 'boolean') {
					parsedFlags[primaryName] = true;
				} else if (flag.expectsValue) {
					const nextArg = rawArgs[i + 1];
					if (nextArg && !nextArg.startsWith('-')) {
						parsedFlags[primaryName] = nextArg;
						i++; // Skip the value
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

	return { commandName, commandArgs, parsedFlags };
}

/**
 * Format help text for a flag
 */
export function formatFlagHelp(flag: CliFlag): string {
	const names = flag.names.join(', ');
	const valueHint = flag.expectsValue ? ' <value>' : '';
	return `  ${names}${valueHint}\t${flag.description}`;
}

/**
 * Generate help text for all global flags
 */
export function generateFlagsHelp(): string {
	return globalFlags.map(formatFlagHelp).join('\n');
}

/**
 * Check if a specific flag is set
 */
export function hasFlag(
	flags: ParsedArgs['parsedFlags'],
	name: string
): boolean {
	return flags[name] === true;
}

/**
 * Get a flag value
 */
export function getFlagValue(
	flags: ParsedArgs['parsedFlags'],
	name: string
): string | undefined {
	const value = flags[name];
	return typeof value === 'string' ? value : undefined;
}

/**
 * Parse subcommand from command args
 */
export function parseSubcommand(
	args: string[],
	subcommands: CliCommand[]
): { subcommand: CliCommand | undefined; remainingArgs: string[] } {
	const subcommandName = args[0];
	const subcommand = subcommands.find((cmd) => cmd.name === subcommandName);

	if (subcommand) {
		return {
			subcommand,
			remainingArgs: args.slice(1),
		};
	}

	return {
		subcommand: undefined,
		remainingArgs: args,
	};
}
