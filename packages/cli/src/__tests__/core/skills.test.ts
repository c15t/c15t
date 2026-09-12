import { ChildProcess } from 'node:child_process';
import type { spawn } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import { installSkills } from '../../commands/skills';
import { createCliContext } from '../../context/creator';
import { createCliLogger } from '../../utils/logger';

const makeContext = (args: string[]) =>
	createCliContext(args, process.cwd(), [], {
		interactive: false,
		logger: createCliLogger('error', { write: () => {} }),
		telemetry: false,
	});
const spawnWithExit = (code: number) =>
	vi.fn<typeof spawn>(() => {
		const child = new ChildProcess();
		queueMicrotask(() => child.emit('close', code, null));
		return child;
	});

describe('skills installer', () => {
	it('propagates the installer failure', async () => {
		const context = await makeContext(['--yes']);
		await expect(
			installSkills(context, { spawn: spawnWithExit(2) })
		).rejects.toMatchObject({ code: 'INSTALL_FAILED' });
	});
	it('forwards --yes to the child process', async () => {
		const context = await makeContext(['--yes']);
		const spawn = spawnWithExit(0);
		expect(await installSkills(context, { spawn })).toEqual({
			installed: true,
		});
		expect(spawn).toHaveBeenCalledWith(
			'npx',
			['skills', 'add', 'c15t/skills', '--yes'],
			expect.objectContaining({ stdio: 'inherit' })
		);
	});
	it('fails before spawning when noninteractive input is missing', async () => {
		const context = await makeContext([]);
		const spawn = spawnWithExit(0);
		await expect(installSkills(context, { spawn })).rejects.toMatchObject({
			code: 'INPUT_REQUIRED',
		});
		expect(spawn).not.toHaveBeenCalled();
	});
	it('does not mix child terminal output with a JSON result', async () => {
		const context = await makeContext(['--yes', '--json']);
		const spawn = spawnWithExit(0);
		await expect(installSkills(context, { spawn })).rejects.toMatchObject({
			code: 'FLAG_INVALID',
		});
		expect(spawn).not.toHaveBeenCalled();
	});
});
