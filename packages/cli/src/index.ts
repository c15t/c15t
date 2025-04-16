#!/usr/bin/env node

import * as p from '@clack/prompts';
import color from 'picocolors';
import 'dotenv/config';

import type { C15TOptions } from '@c15t/backend';
import { getConfig } from './actions/get-config';
import { getPackageInfo } from './actions/get-package-info';
import { showHelpMenu } from './actions/show-help-menu';
import { generate } from './commands/generate';
import { migrate } from './commands/migrate';
import { displayIntro } from './components/intro';
import { startOnboarding } from './onboarding';

// Import context creator and types
import { createCliContext } from './context/creator';
import { globalFlags } from './context/parser'; // Import flags for help menu
import type { CliCommand, CliContext } from './context/types';

// Define commands (using types from context)
const commands: CliCommand[] = [
	{
		name: 'generate',
		label: 'generate',
		hint: 'Generate schema/code',
		description: 'Generate schema/code based on your c15t config.',
		action: (context) => generate(context), // Action signature needs update
	},
	{
		name: 'migrate',
		label: 'migrate',
		hint: 'Run database migrations',
		description: 'Run database migrations based on your c15t config.',
		action: (context) => migrate(context), // Action signature needs update
	},
];

// Function to handle cancellation gracefully (needs context)
function handleCancel(context: CliContext) {
	context.logger.info('Operation cancelled by user.');
	p.cancel('Operation cancelled.');
	process.exit(1);
}

export async function main() {
	// --- Context Setup ---
	const rawArgs = process.argv.slice(2);
	const cwd = process.cwd();
	// Pass commands array to creator, as parser needs it
	const context = createCliContext(rawArgs, cwd, commands);
	const { logger, flags, commandName, commandArgs } = context;

	// --- Package Info & Early Exit Check ---
	// TODO: Update getPackageInfo to accept context if needed
	const packageInfo = await getPackageInfo(context);
	const version = packageInfo.version || 'unknown';

	if (flags.version) {
		logger.debug('DEBUG test');
		logger.info('Version flag detected. Displaying version and exiting.');
		p.log.message(`c15t CLI version ${version}`);
		process.exit(0);
	}

	if (flags.help) {
		logger.info('Help flag detected. Displaying help and exiting.');
		// TODO: Update showHelpMenu to accept context if needed (instead of flags)
		showHelpMenu(context, version, commands, globalFlags);
		process.exit(0);
	}

	// --- Regular Execution Flow ---
	logger.info('Starting c15t CLI execution...');
	logger.debug('Raw process arguments:', process.argv);
	logger.debug('Parsed command name:', commandName);
	logger.debug('Parsed command args:', commandArgs);
	logger.debug('Parsed global flags:', flags);

	// TODO: Update displayIntro if context is needed
	await displayIntro(version);

	// --- Configuration Check ---
	const configPath = flags.config as string | undefined;
	logger.debug(`Current working directory: ${cwd}`);
	logger.debug(`Config path flag: ${configPath}`);
	let config: C15TOptions | undefined;
	try {
		// TODO: Update getConfig to accept context
		const loadedConfig = await getConfig(context);
		config = loadedConfig ?? undefined;
	} catch (error) {
		logger.error('Unexpected error during configuration loading:', error);
		p.log.error('An unexpected error occurred during configuration loading:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Setup failed.')}`);
		process.exit(1);
		return;
	}

	// --- Onboarding or Command Handling ---
	if (!config) {
		logger.info('No config file found, initiating onboarding.');
		// TODO: Update startOnboarding to accept context
		await startOnboarding({ cwd });
		logger.info('Onboarding process likely exited or completed.');
		return;
	}

	logger.info('Config file found and loaded successfully.');
	logger.debug('Loaded config object:', config);
	p.log.success('✔ Config file found!');
	p.log.message('');

	// --- Execute Command or Show Interactive Menu ---
	try {
		if (commandName) {
			const command = commands.find((cmd) => cmd.name === commandName);
			if (command) {
				logger.info(`Executing command: ${command.name}`);
				// Pass the whole context to the command action
				await command.action(context);
			} else {
				logger.warn(`Unknown command provided: ${commandName}`);
				p.log.error(`Unknown command: ${color.yellow(commandName)}`);
				p.log.info(
					`Run ${color.cyan('c15t --help')} to see available commands.`
				);
				process.exit(1);
			}
		} else {
			logger.debug('No command specified, entering interactive selection.');

			const promptOptions = commands.map((cmd) => ({
				value: cmd.name,
				label: cmd.label,
				hint: cmd.hint,
			}));
			promptOptions.push({
				value: 'exit',
				label: 'exit',
				hint: 'Close the CLI',
			});

			const selectedCommandName = await p.select({
				message: 'Which command would you like to run?',
				options: promptOptions,
			});

			if (p.isCancel(selectedCommandName) || selectedCommandName === 'exit') {
				logger.debug('Interactive selection cancelled or exit chosen.');
				handleCancel(context);
			} else {
				const selectedCommand = commands.find(
					(cmd) => cmd.name === selectedCommandName
				);
				if (selectedCommand) {
					logger.info(`User selected command: ${selectedCommand.name}`);
					// Pass context to interactively selected command
					await selectedCommand.action(context);
				} else {
					logger.error(
						`Internal error: Selected command '${selectedCommandName}' not found in command list.`
					);
					p.log.error('An internal error occurred.');
					process.exit(1);
				}
			}
		}
		logger.info('Command execution finished.');
	} catch (error) {
		logger.error('Caught unexpected error during command execution:', error);
		p.log.error('An unexpected error occurred during command execution:');
		if (error instanceof Error) {
			p.log.message(error.message);
		} else {
			p.log.message(String(error));
		}
		p.outro(`${color.red('Operation failed unexpectedly.')}`);
		process.exit(1);
	}
}

main();
