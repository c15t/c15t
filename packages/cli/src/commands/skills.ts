/**
 * Install Skills command
 *
 * Installs c15t agent skills for AI-assisted development (Claude, Cursor, etc.)
 */

import { spawn } from 'node:child_process';
import { once } from 'node:events';
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

	const execCommands: Record<string, string> = {
		bun: 'bunx',
		pnpm: 'pnpm dlx',
		yarn: 'yarn dlx',
		npm: 'npx',
	};
	const execCommand = execCommands[packageManager.name] ?? 'npx';
	const [cmd, ...baseArgs] = execCommand.split(' ');

	logger.info(`Running: ${execCommand} skills add c15t/skills`);

	try {
		const child = spawn(cmd!, [...baseArgs, 'skills', 'add', 'c15t/skills'], {
			cwd: context.projectRoot,
			stdio: 'inherit',
		});

		const [exitCode] = await once(child, 'exit');

		if (exitCode === 0) {
			logger.success('Agent skills installed successfully!');
			telemetry.trackEvent(TelemetryEventName.ONBOARDING_COMPLETED, {
				action: 'skills_installed',
			});
		} else {
			logger.error(
				`Skills installation failed (exit code ${exitCode}). Please try again or install manually with: npx skills add c15t/skills`
			);
		}
	} catch (error) {
		logger.error(
			`Skills installation failed: ${error instanceof Error ? error.message : String(error)}`
		);
		logger.info('You can install manually with: npx skills add c15t/skills');
	}
}
