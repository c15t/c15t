import { globalFlags as hexbusGlobalFlags } from 'hexbus';
import type { CliFlag } from './types';

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
	{
		defaultValue: false,
		description: 'Preview changes without writing files.',
		expectsValue: false,
		names: ['--dry-run'],
		type: 'boolean',
	},
];
