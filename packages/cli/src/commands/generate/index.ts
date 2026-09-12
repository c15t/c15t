/**
 * Generate command - sets up c15t in a project
 *
 * This command uses a state machine to:
 * 1. Run pre-flight checks
 * 2. Prompt for storage mode selection
 * 3. Configure the selected mode
 * 4. Generate necessary files
 * 5. Install dependencies
 * 6. Display next steps
 *
 * Features:
 * - Resume from interrupted state (--resume flag)
 * - Automatic rollback on error/cancel
 * - Unified cancellation handling
 * - Auto-tracked telemetry
 */

import type { CliCommand, CliContext } from '~/context/types';

import { STORAGE_MODES } from '../../constants';
import type { StorageMode } from '../../constants';
import {
	isBoilerplateSetup,
	usesExplicitSetup,
} from '../../context/setup-routing';
import { CliError } from '../../core/errors';

const normalizeModeArg = function normalizeModeArg(
	mode?: StorageMode
): StorageMode | undefined {
	if (!mode || mode.startsWith('-')) {
		return undefined;
	}
	const validModes = new Set(Object.values(STORAGE_MODES));
	return validModes.has(mode) ? mode : undefined;
};

/**
 * Generate command action using state machine
 */
const generateAction = async function generateAction(
	context: CliContext
): Promise<unknown> {
	const { logger, commandArgs, flags } = context;
	if (
		commandArgs.length > 1 ||
		(commandArgs[0] && !normalizeModeArg(commandArgs[0] as StorageMode))
	) {
		throw new CliError('FLAG_INVALID', {
			details: 'Expected one setup mode: hosted, offline, or custom.',
		});
	}
	if (isBoilerplateSetup(flags)) {
		return (await import('./boilerplate')).generateBoilerplate(context);
	}

	// Check if mode was passed as argument
	const modeArg = normalizeModeArg(commandArgs[0] as StorageMode | undefined);

	// Check for resume flag
	const resume = flags.resume === true;

	// Check for debug flag
	const debug = flags.debug === true || flags.logger === 'debug';

	logger.debug('Starting generate command with state machine...');
	logger.debug(`Mode arg: ${modeArg}`);
	logger.debug(`Resume: ${resume}`);

	if (usesExplicitSetup(flags, modeArg)) {
		const { generateWithoutPrompts } = await import('./non-interactive');
		return generateWithoutPrompts(context);
	}
	const { runGenerateMachine } = await import('~/machines/generate/runner');
	const result = await runGenerateMachine({
		context,
		debug,
		modeArg,
		persist: true,
		resume,
	});
	if (!result.success) {
		throw new CliError(
			result.context.cancelReason ? 'CANCELLED' : 'CONFIG_INVALID',
			{
				details:
					result.errors.at(-1)?.error.message ??
					result.context.cancelReason ??
					'Setup did not complete. Review the preflight results.',
			}
		);
	}
};

/**
 * Legacy generate function for backwards compatibility
 */
export const generate = function generate(context: CliContext, mode?: string) {
	// Set the mode in commandArgs if provided
	if (mode) {
		context.commandArgs = [mode];
	}
	return generateAction(context);
};

/**
 * Generate command definition
 */
export const generateCommand: CliCommand = {
	action: generateAction,
	description:
		'Set up c15t consent management in your project with interactive configuration',
	hint: 'Add c15t to your project (Recommended)',
	label: 'Generate',
	name: 'generate',
};
