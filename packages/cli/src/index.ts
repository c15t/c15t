#!/usr/bin/env node

import * as p from '@clack/prompts';
import 'dotenv/config';
import open from 'open';
import color from 'picocolors';
import { showHelpMenu } from './actions/show-help-menu';
import { generate } from './commands/generate';
import { selfHost } from './commands/self-host';
import { displayIntro } from './components/intro';

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
		label: 'Generate (Recommended)',
		hint: 'Add c15t to your project',
		description: 'Setup your c15t project',
		action: (context) => generate(context),
	},
	{
		name: 'self-host',
		label: 'Self Host',
		hint: 'Host c15t backend on your own infra',
		description: 'Commands for self-hosting c15t (generate, migrate).',
		action: (context) => selfHost(context),
	},
	{
		name: 'github',
		label: 'GitHub',
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
	const context = await createCliContext(rawArgs, cwd, commands);
	const { logger, flags, commandName, commandArgs, error, telemetry } = context;

	// --- Package Info & Early Exit Check ---
	const packageInfo = context.fs.getPackageInfo();
	const version = packageInfo.version;

	// Inform users about telemetry if it's enabled
	if (!telemetry.isDisabled()) {
		logger.note(
			`c15t collects anonymous usage data to help improve the CLI. 
This data is not personally identifiable and helps us prioritize features.
To disable telemetry, use the ${color.cyan('--no-telemetry')}
flag or set ${color.cyan('C15T_TELEMETRY_DISABLED=1')} in your environment.`,
			`${formatLogMessage('info', 'Telemetry Notice')}`
		);
	}

	// Track CLI invocation (without command yet)
	try {
		telemetry.trackEvent(TelemetryEventName.CLI_INVOKED, {
			version,
			nodeVersion: process.version,
			platform: process.platform,
		});
		// Explicitly flush to ensure the event is sent immediately
		telemetry.flushSync();
	} catch (error) {
		logger.debug('Failed to track CLI invocation:', error);
	}

	if (flags.version) {
		logger.debug('Version flag detected');
		logger.message(`c15t CLI version ${version}`);
		telemetry.trackEvent(TelemetryEventName.VERSION_DISPLAYED, { version });
		telemetry.flushSync();
		await telemetry.shutdown();
		process.exit(0);
	}

	if (flags.help) {
		logger.debug('Help flag detected. Displaying help and exiting.');
		telemetry.trackEvent(TelemetryEventName.HELP_DISPLAYED, { version });
		telemetry.flushSync();
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
					executionTime: Date.now() - performance.now(),
				});
				telemetry.flushSync();
			} else {
				logger.error(`Unknown command: ${commandName}`);
				telemetry.trackEvent(TelemetryEventName.COMMAND_UNKNOWN, {
					unknownCommand: commandName,
				});
				telemetry.flushSync();
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
					action: p.isCancel(selectedCommandName) ? 'cancelled' : 'exit',
				});
				context.error.handleCancel('Operation cancelled.', {
					command: 'interactive_menu',
					stage: 'exit',
				});
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
						executionTime: Date.now() - performance.now(),
					});
					telemetry.flushSync();
				} else {
					telemetry.trackEvent(TelemetryEventName.COMMAND_UNKNOWN, {
						unknownCommand: String(selectedCommandName),
					});
					telemetry.flushSync();
					error.handleError(
						new Error(`Command '${selectedCommandName}' not found`),
						'An internal error occurred'
					);
				}
			}
		}
		logger.debug('Command execution completed');
		telemetry.trackEvent(TelemetryEventName.CLI_COMPLETED, {
			success: true,
		});
		telemetry.flushSync();
	} catch (executionError) {
		telemetry.trackEvent(TelemetryEventName.COMMAND_FAILED, {
			command: commandName,
			error:
				executionError instanceof Error
					? executionError.message
					: String(executionError),
		});
		telemetry.flushSync();
		error.handleError(
			executionError,
			'An unexpected error occurred during command execution'
		);
	}

	// Ensure telemetry is properly shut down
	await telemetry.shutdown();
}

main();
