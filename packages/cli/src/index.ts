#!/usr/bin/env node

/**
 * c15t CLI - Consent Management Made Easy
 *
 * Main entry point for the CLI. Handles:
 * - Command routing
 * - Context creation
 * - Telemetry
 * - Help/version display
 */

import * as p from '@clack/prompts';
import 'dotenv/config';
import open from 'open';
import color from 'picocolors';
import { showHelpMenu } from './actions/show-help-menu';
import { codemodsCommand } from './commands/codemods';
import { generate } from './commands/generate';
import { projectsAction } from './commands/instances';
import { selfHost } from './commands/self-host';
import { installSkills } from './commands/skills';
import { displayIntro } from './components/intro';

// Import from new v2 modules
import { URLS } from './constants';

// Import context creator and types
import { createCliContext } from './context/creator';
import { globalFlags } from './context/parser';
import type { CliCommand } from './context/types';
import { formatLogMessage } from './utils/logger';
import { TelemetryEventName } from './utils/telemetry';

// Define commands (using types from context)
const commands: CliCommand[] = [
	{
		name: 'setup',
		label: 'Setup (Recommended)',
		hint: 'Set up c15t in your project',
		description: 'Set up c15t in your project.',
		action: (context) => generate(context),
	},
	codemodsCommand,
	{
		name: 'skills',
		label: 'Skills',
		hint: 'Install c15t agent skills for AI tooling',
		description:
			'Install c15t skills for AI-assisted development (Claude, Cursor, etc.)',
		action: (context) => installSkills(context),
	},
	{
		name: 'docs',
		label: 'Docs',
		hint: 'Open c15t documentation',
		description: 'Open the c15t documentation in your browser.',
		action: async (context) => {
			const { logger } = context;
			await open(`${URLS.DOCS}?ref=cli`);
			logger.success('Documentation opened in your browser.');
		},
	},
	{
		name: 'changelog',
		label: 'Changelog',
		hint: 'Open the latest releases and changes',
		description: 'Open the c15t changelog in your browser.',
		action: async (context) => {
			const { logger } = context;
			await open(URLS.CHANGELOG);
			logger.success('Changelog opened in your browser.');
		},
	},
	{
		name: 'self-host',
		label: 'Self-host',
		hint: 'Self-hosted backend workflow tools',
		description: 'Self-host workflow commands (migrations).',
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
				'Star Us on GitHub'
			);

			await open(URLS.GITHUB);
			logger.success('Thank you for your support!');
		},
	},
	{
		name: 'projects',
		label: 'Projects',
		hint: 'Manage your c15t projects',
		description: 'List, select, and create c15t projects.',
		action: (context) => projectsAction(context),
	},
	{
		name: 'instances',
		label: 'Instances',
		hint: 'Alias for `projects`',
		description: 'Alias for `c15t projects`.',
		action: (context) => projectsAction(context),
		hidden: true,
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

			const promptOptions = commands
				.filter((cmd) => !cmd.hidden)
				.map((cmd) => ({
					value: cmd.name,
					label: cmd.label,
					hint: cmd.hint,
				}));
			promptOptions.push({
				value: 'exit',
				label: 'Exit',
				hint: 'Close the CLI',
			});

			const selectedCommandName = await p.select({
				message: formatLogMessage(
					'info',
					'Which command would you like to run?'
				),
				options: promptOptions,
			});

			if (p.isCancel(selectedCommandName)) {
				logger.debug('Interactive selection cancelled.');
				telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_EXITED, {
					action: 'cancelled',
				});
				context.error.handleCancel('Operation cancelled.', {
					command: 'interactive_menu',
					stage: 'exit',
				});
				return;
			}

			if (selectedCommandName === 'exit') {
				logger.debug('Interactive selection exited.');
				telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_EXITED, {
					action: 'exit',
				});
				logger.outro('Exited c15t CLI.');
				telemetry.flushSync();
				return;
			}

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
