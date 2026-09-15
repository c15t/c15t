import { formatFlagHelp, globalFlags } from '../context/parser';
import type { CliCommand, CliContext, CliFlag } from '../context/types';
import { packageInfo } from '../package-info';

/** Return help data that both terminal and JSON adapters can render. */
export const getCommandHelp = (
	commands: CliCommand[],
	commandName?: string
) => {
	const command = commands.find((candidate) => candidate.name === commandName);
	return {
		commands: (command?.subcommands ?? (command ? [] : commands))
			.filter((candidate) => !candidate.hidden)
			.map((candidate) => ({
				description: candidate.description,
				name: candidate.name,
			})),
		description: command?.description,
		examples: command?.examples ?? ['c15t setup', 'c15t projects list --json'],
		flags: [...globalFlags, ...(command?.flags ?? [])],
		usage:
			command?.usage ??
			(command ? `c15t ${command.name}` : 'c15t <command> [options]'),
		version: packageInfo.version,
	};
};

export const formatHelp = (help: ReturnType<typeof getCommandHelp>): string =>
	[
		`c15t ${help.version}`,
		'',
		`Usage: ${help.usage}`,
		...(help.description ? ['', help.description] : []),
		...(help.commands.length
			? [
					'',
					'Commands:',
					...help.commands.map(
						(command) => `  ${command.name.padEnd(14)}${command.description}`
					),
				]
			: []),
		'',
		'Options:',
		...help.flags.map(formatFlagHelp),
		'',
		'Examples:',
		...help.examples.map((example) => `  ${example}`),
	].join('\n');

export const showHelpMenu = (
	context: CliContext,
	_version: string,
	commands: CliCommand[],
	_flags: CliFlag[]
): void =>
	context.logger.message(
		formatHelp(getCommandHelp(commands, context.commandName))
	);
