import { selectCommand } from 'hexbus';
import type { CliCommand, CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';
import { TelemetryEventName } from '~/utils/telemetry';
import { migrate } from './migrate';

async function runSelfHostMigrate(context: CliContext) {
	context.telemetry.trackEvent(TelemetryEventName.SELF_HOST_STARTED, {});
	await migrate(context);
}

// Define self-host subcommands
export const selfHostSubcommands: CliCommand[] = [
	{
		name: 'migrate',
		label: 'Migrate database',
		hint: 'Run latest database migrations',
		description: 'Run latest database migrations for self-hosted deployments',
		action: runSelfHostMigrate,
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
				process.exitCode = 1;
				return;
		}
		return;
	}

	// If no subcommand is provided, show interactive menu
	logger.debug('No subcommand specified, entering interactive selection.');
	telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_OPENED, {
		context: 'self-host',
	});

	const selection = await selectCommand(context, selfHostSubcommands, {
		exitHint: 'Close the CLI',
		exitLabel: 'Exit',
		exitValue: 'exit',
		message: formatLogMessage(
			'info',
			'Which self-host task would you like to run?'
		),
	});

	if (selection.type === 'cancelled') {
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

	if (selection.type === 'exited') {
		logger.debug('Self-host interactive selection exited.');
		telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_EXITED, {
			action: 'exit',
			context: 'self-host',
		});
		logger.outro('Exited self-host menu.');
		return;
	}

	if (selection.type === 'selected') {
		logger.debug(`User selected subcommand: ${selection.command.name}`);
		await selection.command.action?.(context);
	} else {
		logger.error('Unknown subcommand selection');
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

export const selfHostCommand: CliCommand = {
	name: 'self-host',
	label: 'Self-host',
	hint: 'Self-hosted backend workflow tools',
	description: 'Self-host workflow commands (migrations).',
	action: selfHost,
	subcommands: selfHostSubcommands,
};
