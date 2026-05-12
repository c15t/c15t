import {
	globalFlags as hexbusGlobalFlags,
	parseCliArgs as parseHexbusCliArgs,
} from 'hexbus';
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

export function parseCliArgs(
	rawArgs: string[],
	commands: CliCommand[]
): ParsedArgs {
	return parseHexbusCliArgs(rawArgs, commands as never, globalFlags);
}
