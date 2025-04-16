#!/usr/bin/env node

import * as p from '@clack/prompts';
import 'dotenv/config';

import type { C15TOptions } from '@c15t/backend';
import { getConfig } from './actions/get-config';
import { showHelpMenu } from './actions/show-help-menu';
import { generate } from './commands/generate';
import { migrate } from './commands/migrate';
import { displayIntro } from './components/intro';
import { startOnboarding } from './onboarding';

// Import context creator and types
import { createCliContext } from './context/creator';
import { globalFlags } from './context/parser'; // Import flags for help menu
import type { CliCommand, } from './context/types';

// Define commands (using types from context)
const commands: CliCommand[] = [
	{
		name: 'generate',
		label: 'generate',
		hint: 'Generate schema/code',
		description: 'Generate schema/code based on your c15t config.',
		action: (context) => generate(context),
	},
	{
		name: 'migrate',
		label: 'migrate',
		hint: 'Run database migrations',
		description: 'Run database migrations based on your c15t config.',
		action: (context) => migrate(context),
	},
];



export async function main() {
	// --- Context Setup ---
	const rawArgs = process.argv.slice(2);
	const cwd = process.cwd();
	// Pass commands array to creator, as parser needs it
	const context = createCliContext(rawArgs, cwd, commands);
	const { logger, flags, commandName, commandArgs, error } = context;

	// --- Package Info & Early Exit Check ---
	const packageInfo = context.fs.getPackageInfo();
	const version = packageInfo.version;

  if (flags.version) {
		logger.debug('Version flag detected');
		logger.message(`c15t CLI version ${version}`);
		process.exit(0);
	}

	if (flags.help) {
		logger.debug('Help flag detected. Displaying help and exiting.');
		showHelpMenu(context, version, commands, globalFlags);
		process.exit(0);
	}

	// --- Regular Execution Flow ---
	logger.debug('Raw process arguments:', process.argv);
	logger.debug('Parsed command name:', commandName);
	logger.debug('Parsed command args:', commandArgs);
	logger.debug('Parsed global flags:', flags);

	// Display intro with context
	await displayIntro(context, version);

	// --- Configuration Check ---
	logger.debug(`Current working directory: ${cwd}`);
	logger.debug(`Config path flag: ${flags.config}`);
	
	let config: C15TOptions | undefined;
	try {
		const loadedConfig = await getConfig(context);
		config = loadedConfig ?? undefined;
	} catch (loadError) {
		return error.handleError(loadError, 'An unexpected error occurred during configuration loading');
	}

	// --- Onboarding or Command Handling ---
	if (!config) {
		logger.info('No config file found, initiating onboarding.');
		await startOnboarding(context);
		logger.info('Onboarding process completed.');
		return;
	}

	logger.info('Config file found and loaded successfully.');
	logger.debug('Loaded config object:', config);
	logger.info('✅ Config file found!');

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
				logger.error(`Unknown command: ${commandName}`);
				logger.info('Run c15t --help to see available commands.');
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
				context.error.handleCancel('Operation cancelled.');
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
					error.handleError(
						new Error(`Command '${selectedCommandName}' not found`), 
						'An internal error occurred'
					);
				}
			}
		}
		logger.info('Command execution finished.');
	} catch (executionError) {
		error.handleError(
			executionError, 
			'An unexpected error occurred during command execution'
		);
	}
}

main();
