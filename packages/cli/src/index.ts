#!/usr/bin/env node

import * as p from '@clack/prompts';
import color from 'picocolors';
import { generate } from './commands/generate';
import { migrate } from './commands/migrate';
import 'dotenv/config';
import type { C15TOptions } from '@c15t/backend';
import { displayIntro } from './components/intro'; // Corrected path if needed, assuming it's correc
import { startOnboarding } from './onboarding';
import { getConfig } from './utils/get-config';
// import { generateSecret } from './commands/secret'; // Removed import
import { getPackageInfo } from './utils/get-package-info';

// process.on('SIGTERM', () => process.exit(0));

// Function to handle cancellation gracefully
function handleCancel() {
	p.cancel('Operation cancelled.');
	process.exit(0);
}

async function main() {
	const packageInfo = await getPackageInfo();
	const version = packageInfo.version || 'unknown';

	// Display the intro sequence
	await displayIntro(version);

	// --- Configuration Check ---
	const cwd = process.cwd(); // Get current working directory
	let config: C15TOptions | undefined;
	try {
		// Attempt to load config silently first
		const loadedConfig = await getConfig({ cwd });
		config = loadedConfig ?? undefined;
	} catch (error) {
		// Log error only if it prevents proceeding
		p.log.error('Error trying to load configuration:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Setup failed.')}`);
		process.exit(1); // Exit if config loading itself fails
		return;
	}

	// --- Onboarding or Command Handling ---
	if (!config) {
		// No config found - Trigger onboarding
		await startOnboarding({ cwd });
		return; // Exit after onboarding completes
	}
	// Config found - proceed to command handling
	p.log.success('✔ Config file found!'); // Indicate config is loaded
	p.log.message('');

	// Basic argument parsing
	const args = process.argv.slice(2);
	const commandName = args[0];
	const commandArgs = args.slice(1);

	try {
		switch (commandName) {
			case 'migrate':
				// Config is already loaded and verified present, pass to command
				await migrate(commandArgs);
				break;
			case 'generate':
				// Config is already loaded and verified present, pass to command
				await generate(commandArgs);
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
						{
							value: 'generate',
							label: 'generate',
							hint: 'Generate schema/code',
						},
						{
							value: 'migrate',
							label: 'migrate',
							hint: 'Run database migrations',
						},
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
			default: {
				p.log.error(`Unknown command: ${color.yellow(commandName)}`);
				p.log.info(
					`Run ${color.cyan('c15t --help')} to see available commands.`
				);
				process.exit(1);
			}
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
