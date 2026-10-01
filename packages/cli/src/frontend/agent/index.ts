import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';

import type { AgentSetupPlan } from './prompt';

export { createAgentSetupPlan, DEFAULT_C15T_SETUP_PROMPT } from './prompt';
export type { AgentSetupOptions, AgentSetupPlan } from './prompt';

/**
 * Launch installed Codex interactively with its existing approval settings.
 * @param projectRoot Application directory, used as the agent's working directory.
 * @param plan Task returned by createAgentSetupPlan.
 * @param signal Optional cancellation, terminating the direct child process.
 * @returns The agent's exit code, or 130 when interrupted by a signal.
 * @throws {Error} When the agent cannot start or the caller cancels.
 */
export const launchAgentSetup = async (
	projectRoot: string,
	plan: AgentSetupPlan,
	signal?: AbortSignal
): Promise<number> => {
	signal?.throwIfAborted();
	if (plan.agent !== 'codex' || !plan.prompt || plan.prompt.includes('\0')) {
		throw new Error('Expected a Codex setup task.');
	}
	const child = spawn('codex', ['--', plan.prompt], {
		cwd: realpathSync(projectRoot),
		stdio: 'inherit',
	});
	const abort = () => {
		child.kill('SIGTERM');
	};
	signal?.addEventListener('abort', abort, { once: true });
	if (signal?.aborted) {
		abort();
	}
	try {
		return await new Promise<number>((resolve, reject) => {
			let failure: Error | undefined;
			child.once('error', (error) => {
				failure = error;
			});
			child.once('close', (code) => {
				if (signal?.aborted) {
					reject(
						new Error(
							'Codex setup was cancelled. Review any edits already made.'
						)
					);
				} else if (failure) {
					reject(
						new Error(
							'Could not start Codex. Install the Codex CLI and ensure its executable is on PATH.'
						)
					);
				} else {
					resolve(code ?? 130);
				}
			});
		});
	} finally {
		signal?.removeEventListener('abort', abort);
	}
};
