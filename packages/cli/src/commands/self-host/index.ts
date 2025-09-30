import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';
import { formatLogMessage } from '~/utils/logger';
import { TelemetryEventName } from '~/utils/telemetry';
import { generate } from '../generate';
import { migrate } from './migrate';

// Define self-host subcommands
const subcommands = [
	{
		name: 'generate',
		label: 'Generate',
		hint: 'Generate code for your c15t project',
		action: generate,
	},
	{
		name: 'migrate',
		label: 'Migrate',
		hint: 'Run database migrations',
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
			case 'generate':
				await generate(context, 'self-hosted');
				break;
			case 'migrate':
				await migrate(context);
				break;
			default:
				logger.error(`Unknown self-host subcommand: ${subcommand}`);
				logger.info('Available subcommands: generate, migrate');
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
		hint: 'Return to main menu',
	});

	const selectedSubcommandName = await p.select({
		message: formatLogMessage(
			'info',
			'Which self-host command would you like to run?'
		),
		options: promptOptions,
	});

	if (p.isCancel(selectedSubcommandName) || selectedSubcommandName === 'exit') {
		logger.debug('Interactive selection cancelled or exit chosen.');
		telemetry.trackEvent(TelemetryEventName.INTERACTIVE_MENU_EXITED, {
			action: p.isCancel(selectedSubcommandName) ? 'cancelled' : 'exit',
			context: 'self-host',
		});
		error.handleCancel('Operation cancelled.', {
			command: 'self-host',
			stage: 'menu_selection',
		});
		return;
	}

	const selectedSubcommand = subcommands.find(
		(cmd) => cmd.name === selectedSubcommandName
	);

	if (selectedSubcommand) {
		logger.debug(`User selected subcommand: ${selectedSubcommand.name}`);

		if (selectedSubcommand.name === 'generate') {
			await generate(context, 'self-hosted');
		} else {
			await selectedSubcommand.action(context);
		}
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
