import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';
import { TelemetryEventName } from '~/utils/telemetry';
import { migrate } from './migrate';

// Define self-host subcommands
const subcommands = [
	{
		name: 'migrate',
		label: 'Migrate database',
		hint: 'Run latest database migrations',
		action: migrate,
	},
];

/**
 * Self-host command - parent command for self-hosting related functionality
 */
export async function selfHost(context: CliContext) {
	const { logger, telemetry, commandArgs, error } = context;
	logger.debug('Starting self-host command...');

	// Track self-host command start
	telemetry.trackEvent(TelemetryEventName.SELF_HOST_STARTED, {});

	const [subcommand] = commandArgs;

	if (subcommand) {
		// If subcommand is provided, execute it directly
		switch (subcommand) {
			case 'migrate':
				await migrate(context);
				break;
			default:
				logger.error(`Unknown self-host subcommand: ${subcommand}`);
				logger.info('Available subcommands: migrate');
				logger.info('Usage: c15t self-host <migrate>');
				telemetry.trackEvent(TelemetryEventName.SELF_HOST_COMPLETED, {
					success: false,
					reason: 'unknown_subcommand',
				});
				return;
		}
		return;
	}

	// If no subcommand is provided, show interactive menu
	logger.debug('No subcommand specified, entering interactive selection.');
	telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_OPENED, {
		context: 'self-host',
	});

	const promptOptions = subcommands.map((cmd) => ({
		value: cmd.name,
		label: cmd.label,
		hint: cmd.hint,
	}));

	promptOptions.push({
		value: 'exit',
		label: 'Exit',
		hint: 'Close the CLI',
	});

	const selectedSubcommandName = await p.select({
		message: formatLogMessage(
			'info',
			'Which self-host task would you like to run?'
		),
		options: promptOptions,
	});

	if (p.isCancel(selectedSubcommandName)) {
		logger.debug('Self-host interactive selection cancelled.');
		telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_EXITED, {
			action: 'cancelled',
			context: 'self-host',
		});
		error.handleCancel('Operation cancelled.', {
			command: 'self-host',
			stage: 'menu_selection',
		});
		return;
	}

	if (selectedSubcommandName === 'exit') {
		logger.debug('Self-host interactive selection exited.');
		telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_EXITED, {
			action: 'exit',
			context: 'self-host',
		});
		logger.outro('Exited self-host menu.');
		return;
	}

	const selectedSubcommand = subcommands.find(
		(cmd) => cmd.name === selectedSubcommandName
	);

	if (selectedSubcommand) {
		logger.debug(`User selected subcommand: ${selectedSubcommand.name}`);
		await selectedSubcommand.action(context);
	} else {
		logger.error(`Unknown subcommand: ${selectedSubcommandName}`);
		telemetry.trackEvent(TelemetryEventName.SELF_HOST_COMPLETED, {
			success: false,
			reason: 'invalid_selection',
		});
		return;
	}

	telemetry.trackEvent(TelemetryEventName.SELF_HOST_COMPLETED, {
		success: true,
	});
}
