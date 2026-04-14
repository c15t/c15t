import color from 'picocolors';
import type { CliCommand, CliContext, CliFlag } from '~/context/types'; // Import both types

/**
 * Displays the CLI help menu, generating commands and options dynamically.
 *
 * @param context The CLI context
 * @param version The current CLI version.
 * @param commands The array of available CLI commands.
 * @param flags The array of available global CLI flags.
 */
export function showHelpMenu(
	context: CliContext,
	version: string,
	commands: CliCommand[],
	flags: CliFlag[]
): void {
	const { logger } = context;
	logger.debug('Displaying help menu using command and flag structures.');

	const visibleCommands = commands.filter((cmd) => !cmd.hidden);

	const commandColumnWidth =
		Math.max(...visibleCommands.map((cmd) => cmd.name.length), 10) + 2;
	const commandLines = visibleCommands
		.map((cmd) => `  ${cmd.name.padEnd(commandColumnWidth)}${cmd.description}`)
		.join('\n');

	const flagDisplays = flags.map((flag) => {
		const names = flag.names.join(', ');
		// Add placeholder for flags expecting values
		const valuePlaceholder = flag.expectsValue ? ' <value>' : '';
		return names + valuePlaceholder;
	});
	const optionColumnWidth =
		Math.max(...flagDisplays.map((flag) => flag.length), 20) + 2;

	// Dynamically generate the options list
	const optionLines = flags
		.map((flag, index) => {
			const display = flagDisplays[index] ?? '';
			return `  ${display.padEnd(optionColumnWidth)}${flag.description}`;
		})
		.join('\n');

	const helpContent = `c15t CLI version ${version}

Available Commands:
${commandLines}

Options:
${optionLines}

Run a command directly (e.g., ${color.cyan('c15t setup')}) or select one interactively when no command is provided.

For more help, visit: https://v2.c15t.com`;

	logger.debug('Help menu content generated.');
	logger.note(helpContent, 'Usage');
}
