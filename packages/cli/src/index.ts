#!/usr/bin/env node

import * as p from '@clack/prompts';
import color from 'picocolors';
import { generate } from './commands/generate';
import { migrate } from './commands/migrate';
import 'dotenv/config';
// import { generateSecret } from './commands/secret'; // Removed import
import { getPackageInfo } from './utils/get-package-info';

// handle exit
// Use clack's cancel mechanism within commands instead
// process.on('SIGINT', () => process.exit(0));
// process.on('SIGTERM', () => process.exit(0));

// Function to handle cancellation gracefully
function handleCancel() {
	p.cancel('Operation cancelled.');
	process.exit(0);
}

async function main() {
	const packageInfo = await getPackageInfo();
	const version = packageInfo.version || 'unknown';

	// Clear console for a cleaner look (optional)
	console.clear(); 

	// Fancy intro with border
	const title = ` c15t CLI ${color.dim(`v${version}`)} `;
	const docs = ` ${color.dim('Documentation: https://c15t.com/docs')} `;
	const maxLen = Math.max(title.length - color.dim(`v${version}`).length - 7, docs.length - 7 ); // Adjust length for color codes
	const borderTop = `┌${'─'.repeat(maxLen + 2)}┐`;
	const borderBottom = `└${'─'.repeat(maxLen + 2)}┘`;
	const padding = ' '.repeat(maxLen);

	p.log.message(color.cyan(borderTop));
	p.log.message(`${color.cyan('│')} ${color.bgCyan(color.black(title))}${' '.repeat(maxLen - (title.length - color.dim(`v${version}`).length - 7) + 1)}${color.cyan('│')}`);
	p.log.message(`${color.cyan('│')}${(padding)}${color.cyan('│')}`); // Empty line for spacing
	p.log.message(`${color.cyan('│')} ${docs}${' '.repeat(maxLen - (docs.length - 7) + 1)}${color.cyan('│')}`);
	p.log.message(color.cyan(borderBottom));
	p.log.message(''); // Add an extra newline for spacing after the box

	// Basic argument parsing
	const args = process.argv.slice(2); // Remove 'node' and script path
	const commandName = args[0];
	const commandArgs = args.slice(1);

	try {
		switch (commandName) {
			case 'migrate':
				await migrate(commandArgs); // Pass remaining args
				break;
			case 'generate':
				await generate(commandArgs); // Pass remaining args
				break;
			// Removed secret case
			// case 'secret':
			// 	await generateSecret(commandArgs);
			// 	break;
			case '-v':
			case '--version':
				p.log.message(`c15t CLI version ${version}`);
				break;
			case undefined:
			// If no command, show interactive menu directly
			case '-h':
			case '--help': {
				// Show help text first for -h/--help
				if (commandName === '-h' || commandName === '--help') {
					p.note(
						`Available Commands:
  migrate   - Run database migrations based on your c15t config.
  generate  - Generate schema/code based on your c15t config.

Run a command directly (e.g., c15t generate) or select one below.`,
						'Usage'
					);
				}

				// Interactive command selection
				const selectedCommand = await p.select({
					message: 'Which command would you like to run?',
					options: [
						{ value: 'generate', label: 'generate', hint: 'Generate schema/code' },
						{ value: 'migrate', label: 'migrate', hint: 'Run database migrations' },
						{ value: 'exit', label: 'exit', hint: 'Close the CLI' }, // Add exit option
					],
				});

				if (p.isCancel(selectedCommand) || selectedCommand === 'exit') {
					handleCancel();
					break;
				}

				if (selectedCommand === 'generate') {
					await generate([]); // Run generate with empty args
				} else if (selectedCommand === 'migrate') {
					await migrate([]); // Run migrate with empty args
				}
				break;
			}
			default:
				p.log.error(`Unknown command: ${color.yellow(commandName)}`);
				p.log.info(
					`Run ${color.cyan('c15t --help')} to see available commands.`
				);
				process.exit(1);
		}
		// Assuming commands handle their own outro or cancellation
		// p.outro("Operation completed."); // Commands might exit early or cancel
	} catch (error) {
		p.log.error('An unexpected error occurred:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Operation failed.')}`);
		process.exit(1);
	}
}

main();
