import { spawn } from 'node:child_process';
import { once } from 'node:events';

import type { CliContext } from '../context/types';
import { CliError } from '../core/errors';

/** Install the maintained c15t skills using the user's package manager. */
export const installSkills = async (
	context: CliContext,
	dependencies = { spawn }
): Promise<{ installed: true }> => {
	if (context.flags.json === true) {
		throw new CliError('FLAG_INVALID', {
			details:
				'The skills installer has its own terminal output and does not support --json. Run c15t skills --yes instead.',
		});
	}
	const yes = context.flags.yes === true || context.flags.y === true;
	if (context.flags['non-interactive'] === true && !yes) {
		throw new CliError('INPUT_REQUIRED', {
			details: 'Run c15t skills --yes to install without prompts.',
		});
	}
	const runners = {
		bun: ['bunx'],
		npm: ['npx'],
		pnpm: ['pnpm', 'dlx'],
		yarn: ['yarn', 'dlx'],
	} as const;
	const [command, ...prefix] = runners[context.packageManager.name];
	const args = [
		...prefix,
		'skills',
		'add',
		'c15t/skills',
		...(yes ? ['--yes'] : []),
	];
	context.logger.info(`Running: ${command} ${args.join(' ')}`);
	try {
		const child = dependencies.spawn(command, args, {
			cwd: context.projectRoot,
			stdio: 'inherit',
		});
		const [code, signal] = await once(child, 'close');
		if (code !== 0) {
			throw new Error(
				`Installer exited with ${signal ? `signal ${signal}` : `code ${code}`}`
			);
		}
		return { installed: true };
	} catch (error) {
		throw new CliError('INSTALL_FAILED', {
			details: error instanceof Error ? error.message : String(error),
		});
	}
};
