import * as p from '@clack/prompts';
import color from 'picocolors';
import type { CliCommand, CliContext, CliFlag } from '~/context/types'; // Import both types

/**
 * Displays the CLI help menu, generating commands and options dynamically.
 *
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

	const commandLines = commands
		.map((cmd) => `  ${cmd.name.padEnd(10)} ${cmd.description}`)
		.join('\n');

	// Dynamically generate the options list
	const optionLines = flags
		.map((flag) => {
			const names = flag.names.join(', ');
			// Add placeholder for flags expecting values
			const valuePlaceholder = flag.expectsValue ? ' <value>' : '';
			return `  ${(names + valuePlaceholder).padEnd(20)} ${flag.description}`;
		})
		.join('\n');

	p.note(
		`c15t CLI version ${version}

Available Commands:
${commandLines}

Options:
${optionLines}

Run a command directly (e.g., ${color.cyan('c15t generate')}) or select one interactively when no command is provided.

For more help, visit: https://c15t.dev`,
		'Usage'
	);
}
