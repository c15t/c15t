#!/usr/bin/env bun

import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = fileURLToPath(new URL('..', import.meta.url));

interface SpawnOptions {
	cwd: string;
	env: Record<string, string | undefined>;
	stderr: 'inherit';
	stdin: 'inherit';
	stdout: 'inherit';
}

type SpawnProcess = (
	command: string[],
	options: SpawnOptions
) => { exited: Promise<number> };

interface RunAffectedTestsOptions {
	args?: string[];
	env?: Record<string, string | undefined>;
	spawn?: SpawnProcess;
}

export const runAffectedTests = function runAffectedTests({
	args = process.argv.slice(2),
	env = process.env,
	spawn = Bun.spawn,
}: RunAffectedTestsOptions = {}): Promise<number> {
	const child = spawn(
		[process.execPath, 'turbo', 'run', 'test', '--affected', ...args],
		{
			cwd: REPOSITORY_ROOT,
			env: {
				...env,
				TURBO_SCM_BASE: env.TURBO_SCM_BASE || 'origin/canary',
			},
			stderr: 'inherit',
			stdin: 'inherit',
			stdout: 'inherit',
		}
	);

	return child.exited;
};

if (import.meta.main) {
	process.exitCode = await runAffectedTests();
}
