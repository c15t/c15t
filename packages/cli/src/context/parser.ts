import type { CliCommand as HexbusCliCommand } from 'hexbus';
import { globalFlags as hexbusGlobalFlags } from 'hexbus';
import type { CliCommand, CliFlag, ParsedArgs } from './types';

export const globalFlags: CliFlag[] = [
	...hexbusGlobalFlags,
	{
		defaultValue: false,
		description: 'Resume an interrupted setup flow.',
		expectsValue: false,
		names: ['--resume'],
		type: 'boolean',
	},
	{
		defaultValue: false,
		description: 'Enable setup state-machine debug output.',
		expectsValue: false,
		names: ['--debug'],
		type: 'boolean',
	},
];

function mapCliCommandToHexbusCommand(command: CliCommand): HexbusCliCommand {
	const mapped: HexbusCliCommand = {
		name: command.name,
		label: command.label,
		hint: command.hint,
		description: command.description,
		action: () => Promise.resolve(),
		hidden: command.hidden,
	};

	if (command.subcommands) {
		mapped.subcommands = command.subcommands.map(mapCliCommandToHexbusCommand);
	}

	return mapped;
}

export function mapCliCommandsToHexbusCommands(
	commands: CliCommand[]
): HexbusCliCommand[] {
	return commands.map(mapCliCommandToHexbusCommand);
}

function getPrimaryFlagName(flag: CliFlag): string {
	const longName = flag.names.find((name) => name.startsWith('--'));
	const fallback = flag.names.reduce((longest, name) => {
		let selected = longest;
		if (name.length > longest.length) {
			selected = name;
		} else {
			selected = longest;
		}
		return selected;
	}, '');
	const chosen = longName ?? fallback;
	return chosen.replace(/^--?/, '');
}

export function parseCliArgs(
	rawArgs: string[],
	commands: CliCommand[]
): ParsedArgs {
	const parsedFlags: ParsedArgs['parsedFlags'] = {};
	const potentialCommandArgs: string[] = [];
	let commandName: string | undefined;
	const commandArgs: string[] = [];
	const knownFlagSet = new Set(globalFlags.flatMap((flag) => flag.names));

	for (const flag of globalFlags) {
		const primaryName = getPrimaryFlagName(flag);
		if (!primaryName) {
			continue;
		}

		if (flag.type === 'boolean') {
			parsedFlags[primaryName] = flag.defaultValue ?? false;
		} else {
			parsedFlags[primaryName] = flag.defaultValue;
		}
	}

	for (let index = 0; index < rawArgs.length; index++) {
		const arg = rawArgs[index];
		if (typeof arg !== 'string') {
			continue;
		}

		let isFlag = false;

		for (const flag of globalFlags) {
			if (!flag.names.includes(arg)) {
				continue;
			}

			const primaryName = getPrimaryFlagName(flag);
			if (!primaryName) {
				continue;
			}

			isFlag = true;

			if (flag.type === 'boolean') {
				parsedFlags[primaryName] = true;
			} else if (flag.expectsValue) {
				const nextArg = rawArgs[index + 1];
				if (nextArg && !knownFlagSet.has(nextArg)) {
					parsedFlags[primaryName] = nextArg;
					index++;
				}
			} else {
				parsedFlags[primaryName] = true;
			}
			break;
		}

		if (!isFlag) {
			potentialCommandArgs.push(arg);
		}
	}

	const [firstPositional] = potentialCommandArgs;
	if (
		typeof firstPositional === 'string' &&
		commands.some((command) => command.name === firstPositional)
	) {
		commandName = firstPositional;
		commandArgs.push(...potentialCommandArgs.slice(1));
	} else {
		commandArgs.push(...potentialCommandArgs);
	}

	return { commandArgs, commandName, parsedFlags };
}
