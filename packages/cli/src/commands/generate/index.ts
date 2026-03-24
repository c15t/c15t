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
import { discoverInstalledAgentPackages } from '~/lib/agents/discover-packages';
import { runGenerateMachine } from '~/machines/generate/runner';
import { STORAGE_MODES, type StorageMode } from '../../constants';
import { runAgentsCommand } from '../agents';

function normalizeModeArg(mode?: StorageMode): StorageMode | undefined {
	if (!mode || mode.startsWith('-')) {
		return undefined;
	}
	const validModes = new Set(Object.values(STORAGE_MODES));
	return validModes.has(mode) ? mode : undefined;
}

/**
 * Generate command action using state machine
 */
async function generateAction(context: CliContext): Promise<void> {
	const { logger, commandArgs, flags } = context;

	// Check if mode was passed as argument
	const modeArg = normalizeModeArg(commandArgs[0] as StorageMode | undefined);

	// Check for resume flag
	const resume = flags.resume === true;

	// Check for debug flag
	const debug = flags.debug === true || flags.logger === 'debug';

	logger.debug('Starting generate command with state machine...');
	logger.debug(`Mode arg: ${modeArg}`);
	logger.debug(`Resume: ${resume}`);

	try {
		const result = await runGenerateMachine({
			context,
			modeArg,
			resume,
			debug,
			persist: true,
		});

		if (!result.success) {
			// Machine handles its own error/cancel logging
			// Just exit with error code
			if (result.errors.length > 0) {
				process.exitCode = 1;
			}
			return;
		}

		const shouldForceAgents = commandArgs.includes('--agents');
		const shouldSkipAgents = commandArgs.includes('--no-agents');
		const isNonInteractive = flags.y === true || process.env.CI === 'true';

		if (shouldSkipAgents) {
			return;
		}

		const installed = discoverInstalledAgentPackages(context.projectRoot);
		if (installed.length === 0) {
			return;
		}

		if (shouldForceAgents) {
			await runAgentsCommand(context);
			return;
		}

		if (!isNonInteractive) {
			const confirmed = await context.confirm(
				'Generate AGENTS.md from the installed c15t package docs?',
				true
			);
			if (confirmed) {
				await runAgentsCommand(context);
			}
		}
	} catch (error) {
		logger.error(
			`Generate command failed: ${error instanceof Error ? error.message : String(error)}`
		);
		process.exitCode = 1;
	}
}

/**
 * Legacy generate function for backwards compatibility
 */
export async function generate(context: CliContext, mode?: string) {
	// Set the mode in commandArgs if provided
	if (mode) {
		context.commandArgs = [mode];
	}
	return generateAction(context);
}

/**
 * Generate command definition
 */
export const generateCommand: CliCommand = {
	name: 'generate',
	label: 'Generate',
	hint: 'Add c15t to your project (Recommended)',
	description:
		'Set up c15t consent management in your project with interactive configuration',
	action: generateAction,
};
