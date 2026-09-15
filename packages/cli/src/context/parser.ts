import { CliError } from '../core/errors';
import type { CliCommand, CliFlag, ParsedArgs } from './types';

const booleanFlag = (names: string[], description: string): CliFlag => ({
	description,
	expectsValue: false,
	names,
	type: 'boolean',
});
const stringFlag = (names: string[], description: string): CliFlag => ({
	description,
	expectsValue: true,
	names,
	type: 'string',
});

export const globalFlags: CliFlag[] = [
	booleanFlag(['--help', '-h'], 'Show help for this command.'),
	booleanFlag(['--version', '-v'], 'Show the installed CLI version.'),
	stringFlag(['--cwd'], 'Run in this project directory.'),
	stringFlag(['--logger'], 'Log level: error, warn, info, debug.'),
	booleanFlag(['--yes', '-y'], 'Accept confirmation prompts.'),
	booleanFlag(
		['--non-interactive'],
		'Fail when an input would require a prompt.'
	),
	booleanFlag(
		['--json'],
		'Print one JSON result; disable interactive prompts.'
	),
	booleanFlag(['--no-telemetry'], 'Disable telemetry data collection.'),
	booleanFlag(['--telemetry-debug'], 'Log telemetry diagnostics.'),
];

export const setupFlags: CliFlag[] = [
	booleanFlag(
		['--boilerplate'],
		'Generate standalone v3 integration files without installing packages.'
	),
	stringFlag(
		['--framework'],
		'Boilerplate target: next-app, next-pages, react, javascript, tanstack-start, vue, nuxt, svelte, sveltekit, solid, astro.'
	),
	stringFlag(
		['--output'],
		'Project-relative boilerplate directory; defaults to src/consent.'
	),
	stringFlag(
		['--package-source'],
		'Local c15t checkout with prepared unpublished package tarballs.'
	),
	stringFlag(['--mode'], 'Consent storage mode.'),
	stringFlag(['--backend-url'], 'Hosted or self-hosted backend URL.'),
	stringFlag(['--project'], 'Hosted project ID or name.'),
	booleanFlag(['--env'], 'Generate an environment file for the backend URL.'),
	booleanFlag(['--proxy'], 'Use the framework backend proxy.'),
	booleanFlag(['--ssr'], 'Enable server rendering integration.'),
	booleanFlag(['--devtools'], 'Include consent development tools.'),
	stringFlag(['--ui-style'], 'UI style: prebuilt or expanded.'),
	stringFlag(['--theme'], 'Theme preset.'),
	stringFlag(['--scripts'], 'Comma-separated script IDs.'),
	booleanFlag(
		['--skip-install'],
		'Generate files without installing dependencies.'
	),
	booleanFlag(['--plan'], 'Return the setup plan without writing files.'),
	booleanFlag(['--dry-run'], 'Return the setup plan without writing files.'),
	booleanFlag(['--apply'], 'Apply the setup plan.'),
	booleanFlag(['--resume'], 'Resume an interrupted setup.'),
	booleanFlag(['--debug'], 'Log setup state transitions.'),
];
export const codemodFlags: CliFlag[] = [
	booleanFlag(['--dry-run'], 'Report changes without writing files.'),
	booleanFlag(['--all'], 'Run all applicable legacy codemods.'),
	booleanFlag(['--list'], 'List available legacy codemods.'),
	stringFlag(['--from'], 'Source c15t version.'),
	stringFlag(['--to'], 'Target c15t version.'),
];
export const projectFlags: CliFlag[] = [
	stringFlag(['--organization'], 'Organization slug for a new project.'),
	stringFlag(['--region'], 'Region for a new project.'),
	stringFlag(['--project'], 'Project ID, name, or organization/name.'),
	stringFlag(['--name'], 'Slug for a new project.'),
];
export const migrationFlags: CliFlag[] = [
	booleanFlag(
		['--dry-run'],
		'Show the database migration plan without applying it.'
	),
	stringFlag(['--config'], 'Path to the backend configuration file.'),
	booleanFlag(
		['--plan'],
		'Show the database migration plan without applying it.'
	),
	booleanFlag(['--apply'], 'Apply the planned database migrations.'),
];
export const authFlags: CliFlag[] = [
	booleanFlag(['--force'], 'Start a new login even if already authenticated.'),
	booleanFlag(
		['--no-browser'],
		'Print the verification URL without opening a browser.'
	),
];

const primaryName = (flag: CliFlag): string =>
	(flag.names[0] ?? '').replace(/^--?/u, '');

const parseFlag = (
	arg: string,
	nextArg: string | undefined,
	knownFlags: CliFlag[]
) => {
	const equals = arg.indexOf('=');
	const name = equals < 0 ? arg : arg.slice(0, equals);
	const inlineValue = equals < 0 ? undefined : arg.slice(equals + 1);
	const flag = knownFlags.find((candidate) => candidate.names.includes(name));
	if (!flag) {
		throw new CliError('FLAG_UNKNOWN', { details: name });
	}
	const key = primaryName(flag);
	if (!flag.expectsValue) {
		if (
			inlineValue !== undefined &&
			inlineValue !== 'true' &&
			inlineValue !== 'false'
		) {
			throw new CliError('FLAG_INVALID', {
				details: `${name} expects true or false`,
			});
		}
		return { key, skipNext: false, value: inlineValue !== 'false' };
	}
	const value = inlineValue ?? nextArg;
	if (!value || (inlineValue === undefined && value.startsWith('-'))) {
		throw new CliError('FLAG_VALUE_REQUIRED', { details: name });
	}
	return { key, skipNext: inlineValue === undefined, value };
};

/** Parse and validate commands and flags, preserving positional argument order. */
export const parseCliArgs = (
	rawArgs: string[],
	commands: CliCommand[]
): ParsedArgs => {
	const knownFlags = [
		...globalFlags,
		...commands.flatMap((command) => command.flags ?? []),
	];
	const parsedFlags: ParsedArgs['parsedFlags'] = {};
	const positionals: string[] = [];
	const usedFlags: string[] = [];
	let positionalOnly = false;
	for (let index = 0; index < rawArgs.length; index += 1) {
		const arg = rawArgs[index];
		if (arg === undefined) {
			continue;
		}
		if (arg === '--' && !positionalOnly) {
			positionalOnly = true;
			continue;
		}
		if (positionalOnly || !arg.startsWith('-')) {
			positionals.push(arg);
			continue;
		}
		const { key, value, skipNext } = parseFlag(
			arg,
			rawArgs[index + 1],
			knownFlags
		);
		usedFlags.push(key);
		parsedFlags[key] = value;
		if (skipNext) {
			index += 1;
		}
	}
	const [commandName, ...commandArgs] = positionals;
	const command = commands.find((candidate) => candidate.name === commandName);
	if (commandName && !command) {
		throw new CliError('COMMAND_NOT_FOUND', { details: commandName });
	}
	const allowed = new Set(
		[...globalFlags, ...(command?.flags ?? [])].map(primaryName)
	);
	for (const key of usedFlags) {
		if (!allowed.has(key)) {
			throw new CliError('FLAG_UNKNOWN', {
				details: `--${key} is not supported by ${commandName ?? 'this command'}`,
			});
		}
	}
	// Retain the short spelling for existing command implementations.
	parsedFlags.y = parsedFlags.yes === true;
	return { commandArgs, commandName, parsedFlags };
};

export const formatFlagHelp = (flag: CliFlag): string =>
	`  ${flag.names.join(', ')}${flag.expectsValue ? ' <value>' : ''}\t${flag.description}`;
export const generateFlagsHelp = (): string =>
	globalFlags.map(formatFlagHelp).join('\n');
export const hasFlag = (
	flags: ParsedArgs['parsedFlags'],
	name: string
): boolean => flags[name] === true;
export const getFlagValue = (
	flags: ParsedArgs['parsedFlags'],
	name: string
): string | undefined => {
	const value = flags[name];
	return typeof value === 'string' ? value : undefined;
};
export const parseSubcommand = (args: string[], subcommands: CliCommand[]) => {
	const subcommand = subcommands.find((command) => command.name === args[0]);
	return { remainingArgs: subcommand ? args.slice(1) : args, subcommand };
};
