import { describe, expect, it, vi } from 'vitest';

import { runAffectedTests } from './run-affected-tests';

const createSpawn = function createSpawn(exitCode = 0) {
	return vi.fn(() => ({ exited: Promise.resolve(exitCode) }));
};

describe('runAffectedTests', () => {
	it.each([
		['missing', {}],
		['empty', { TURBO_SCM_BASE: '' }],
	])('uses origin/canary when the base is %s', async (_, env) => {
		const spawn = createSpawn();

		await runAffectedTests({ env, spawn });

		expect(spawn).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				env: expect.objectContaining({
					TURBO_SCM_BASE: 'origin/canary',
				}),
			})
		);
	});

	it('preserves a custom base and unrelated environment variables', async () => {
		const spawn = createSpawn();

		await runAffectedTests({
			env: {
				CUSTOM_VALUE: 'preserved',
				TURBO_SCM_BASE: 'origin/parent-branch',
			},
			spawn,
		});

		expect(spawn).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				env: {
					CUSTOM_VALUE: 'preserved',
					TURBO_SCM_BASE: 'origin/parent-branch',
				},
			})
		);
	});

	it('forwards arguments and inherits standard streams', async () => {
		const spawn = createSpawn();

		await runAffectedTests({
			args: ['--filter=@c15t/cli', '--', '--reporter=verbose'],
			env: {},
			spawn,
		});

		expect(spawn).toHaveBeenCalledWith(
			[
				process.execPath,
				'turbo',
				'run',
				'test',
				'--affected',
				'--filter=@c15t/cli',
				'--',
				'--reporter=verbose',
			],
			expect.objectContaining({
				cwd: expect.any(String),
				stderr: 'inherit',
				stdin: 'inherit',
				stdout: 'inherit',
			})
		);
	});

	it('returns the child exit code', async () => {
		const spawn = createSpawn(17);

		await expect(runAffectedTests({ env: {}, spawn })).resolves.toBe(17);
	});
});
