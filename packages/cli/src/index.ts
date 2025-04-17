#!/usr/bin/env node

import * as p from '@clack/prompts';
import 'dotenv/config';
import open from 'open';
import color from 'picocolors';

import type { C15TOptions } from '@c15t/backend';
import type { ConsentManagerOptions } from '@c15t/react';
import { getConfig } from './actions/get-config';
import {
	isC15TOptions,
	isClientOptions,
} from './actions/get-config/config-extraction';
import { showHelpMenu } from './actions/show-help-menu';
import { generate } from './commands/generate';
import { migrate } from './commands/migrate';
import { displayIntro } from './components/intro';
import { startOnboarding } from './onboarding';

// Import context creator and types
import { createCliContext } from './context/creator';
import { globalFlags } from './context/parser'; // Import flags for help menu
import type { CliCommand } from './context/types';
import { formatLogMessage } from './utils/logger';
import { TelemetryEventName } from './utils/telemetry';

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
	{
		name: 'github',
		label: 'Github',
		hint: 'Star us on GitHub',
		description: 'Open our GitHub repository to give us a star.',
		action: async (context) => {
			const { logger } = context;

			// Show the same messaging as in onboarding.ts
			logger.note(
				`We're building c15t as an ${color.bold('open source')} project to make consent management more accessible.\nIf you find this useful, we'd really appreciate a GitHub star - it helps others discover the project!`,
				'⭐ Star Us on GitHub'
			);

			await open('https://github.com/c15t/c15t');
			logger.success('Thank you for your support!');
		},
	},
	{
		name: 'docs',
		label: 'c15t docs',
		hint: 'Open documentation',
		description: 'Open the c15t documentation in your browser.',
		action: async (context) => {
			const { logger } = context;
			await open('https://c15t.com/docs?ref=cli');
			logger.success('Documentation opened in your browser.');
		},
	},
];

export async function main() {
	// --- Context Setup ---
	const rawArgs = process.argv.slice(2);
	const cwd = process.cwd();
	// Pass commands array to creator, as parser needs it
	const context = createCliContext(rawArgs, cwd, commands);
	const { logger, flags, commandName, commandArgs, error, telemetry } = context;

	// --- Package Info & Early Exit Check ---
	const packageInfo = context.fs.getPackageInfo();
	const version = packageInfo.version;

	// Track CLI invocation (without command yet)
	telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
		version,
		nodeVersion: process.version,
		platform: process.platform,
	});

	if (flags.version) {
		logger.debug('Version flag detected');
		logger.message(`c15t CLI version ${version}`);
		telemetry.trackEvent(TelemetryEventName.VERSION_DISPLAYED, { version });
		await telemetry.shutdown();
		process.exit(0);
	}

	if (flags.help) {
		logger.debug('Help flag detected. Displaying help and exiting.');
		telemetry.trackEvent(TelemetryEventName.HELP_DISPLAYED, { version });
		showHelpMenu(context, version, commands, globalFlags);
		await telemetry.shutdown();
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

	let clientConfig: ConsentManagerOptions | undefined;
	let backendConfig: C15TOptions | undefined;

	try {
		// Try to load the config (could be client or backend)
		const loadedConfig = await getConfig(context);
		if (loadedConfig) {
			// Use type guard to determine config type
			if (isClientOptions(loadedConfig)) {
				clientConfig = loadedConfig;
			} else if (isC15TOptions(loadedConfig)) {
				backendConfig = loadedConfig;
			} else {
				// Should not happen if validation works, but handle defensively
				logger.warn('Loaded configuration is of an unknown type.');
			}
		}
		
		if (loadedConfig) {
			telemetry.trackEvent(TelemetryEventName.CONFIG_LOADED, {
				configType: clientConfig ? 'client' : (backendConfig ? 'backend' : 'unknown'),
				hasBackend: Boolean(backendConfig)
			});
		}
	} catch (loadError) {
		telemetry.trackEvent(TelemetryEventName.CONFIG_ERROR, {
			error: loadError instanceof Error ? loadError.message : String(loadError)
		});
		
		return error.handleError(
			loadError,
			'An unexpected error occurred during configuration loading'
		);
	}

	// --- Onboarding or Command Handling ---
	if (!clientConfig) {
		telemetry.trackEvent(TelemetryEventName.ONBOARDING_STARTED, {});
		await startOnboarding(context);
		await telemetry.shutdown();
		return;
	}

	// Display configuration status with regular messages for better visibility
	// Apply brighter color to "consent.io" text
	const coloredConsentIo = color.cyanBright('consent.io');
	const backendStatus = backendConfig
		? 'Backend configuration loaded'
		: `Using ${coloredConsentIo} for your c15t deployment`;

	logger.info(
		`Client configuration successfully loaded and validated \n        ${backendStatus}`
	);

	logger.debug('Client config details:', clientConfig);
	if (backendConfig) {
		logger.debug('Backend config details:', backendConfig);
	}

	// --- Execute Command or Show Interactive Menu ---
	try {
		if (commandName) {
			const command = commands.find((cmd) => cmd.name === commandName);
			if (command) {
				logger.info(`Executing command: ${command.name}`);
				telemetry.trackCommand(command.name, commandArgs, flags);
				await command.action(context);
				telemetry.trackEvent(TelemetryEventName.COMMAND_SUCCEEDED, { 
					command: command.name,
					executionTime: Date.now() - performance.now()
				});
			} else {
				logger.error(`Unknown command: ${commandName}`);
				telemetry.trackEvent(TelemetryEventName.COMMAND_UNKNOWN, { 
					unknownCommand: commandName 
				});
				logger.info('Run c15t --help to see available commands.');
				await telemetry.shutdown();
				process.exit(1);
			}
		} else {
			logger.debug('No command specified, entering interactive selection.');
			telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_OPENED, {});

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
				message: formatLogMessage(
					'info',
					'Which command would you like to run?'
				),
				options: promptOptions,
			});

			if (p.isCancel(selectedCommandName) || selectedCommandName === 'exit') {
				logger.debug('Interactive selection cancelled or exit chosen.');
				telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_EXITED, {
					action: p.isCancel(selectedCommandName) ? 'cancelled' : 'exit'
				});
				context.error.handleCancel('Operation cancelled.');
			} else {
				const selectedCommand = commands.find(
					(cmd) => cmd.name === selectedCommandName
				);
				if (selectedCommand) {
					logger.debug(`User selected command: ${selectedCommand.name}`);
					telemetry.trackCommand(selectedCommand.name, [], flags);
					await selectedCommand.action(context);
					telemetry.trackEvent(TelemetryEventName.COMMAND_SUCCEEDED, { 
						command: selectedCommand.name,
						executionTime: Date.now() - performance.now()
					});
				} else {
					telemetry.trackEvent(TelemetryEventName.COMMAND_UNKNOWN, { 
						unknownCommand: String(selectedCommandName) 
					});
					error.handleError(
						new Error(`Command '${selectedCommandName}' not found`),
						'An internal error occurred'
					);
				}
			}
		}
		logger.debug('Command execution completed');
		telemetry.trackEvent(TelemetryEventName.CLI_COMPLETED, {
			success: true
		});
	} catch (executionError) {
		telemetry.trackEvent(TelemetryEventName.COMMAND_FAILED, {
			command: commandName,
			error: executionError instanceof Error ? executionError.message : String(executionError)
		});
		
		error.handleError(
			executionError,
			'An unexpected error occurred during command execution'
		);
	}
	
	// Ensure telemetry is properly shut down
	await telemetry.shutdown();
}

main();
