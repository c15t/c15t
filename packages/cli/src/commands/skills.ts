/**
 * Install Skills command
 *
 * Installs c15t agent skills for AI-assisted development (Claude, Cursor, etc.)
 */

import { installSkills as installHexbusSkills } from '@inth/hexbus-skills';
import type { CliContext } from '~/context/types';
import { TelemetryEventName } from '~/utils/telemetry';

/**
 * Install c15t agent skills for AI coding assistants
 */
export async function installSkills(context: CliContext) {
	const { logger, packageManager, telemetry } = context;

	logger.info(
		'c15t agent skills give AI coding assistants deep knowledge of c15t APIs, components, and configuration.'
	);
	logger.info(
		'Supported tools: Claude Code, Cursor, GitHub Copilot, and any agent that supports the skills format.'
	);

	await installHexbusSkills({
		cwd: context.projectRoot,
		logger,
		onFailure: (error) => {
			if (error instanceof Error) {
				telemetry.trackError(error, 'skills');
			} else {
				const normalizedError = new Error(String(error));
				telemetry.trackError(normalizedError, 'skills');
			}
		},
		onSuccess: () => {
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
				action: 'skills_installed',
			});
		},
		packageManager: packageManager.name,
		skillRef: 'c15t/skills',
	});
}
