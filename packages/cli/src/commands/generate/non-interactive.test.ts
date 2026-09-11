import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectFramework } from '../../context/framework-detection';
import type { CliContext } from '../../context/types';
import { generateWithoutPrompts } from './non-interactive';

const install = vi.fn();
const run = (context: CliContext) =>
	generateWithoutPrompts(context, { install });
const directories: string[] = [];
afterEach(async () => {
	vi.clearAllMocks();
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});
const fixture = async (flags: CliContext['flags'] = {}) => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-plan-'));
	directories.push(root);
	await writeFile(join(root, 'package.json'), '{}');
	return {
		commandArgs: ['offline'],
		cwd: root,
		flags,
		framework: await detectFramework(root),
		logger: { info: vi.fn(), success: vi.fn() },
		packageManager: { name: 'npm', version: null },
		projectRoot: root,
	} as unknown as CliContext;
};

describe('noninteractive setup', () => {
	it.each(['SIGINT', 'SIGTERM'] as const)(
		'waits for installer teardown before rollback on %s and removes signal handlers',
		async (signalName) => {
			const context = await fixture({ apply: true, json: true });
			const started = Promise.withResolvers<undefined>();
			const aborted = Promise.withResolvers<undefined>();
			const closed = Promise.withResolvers<undefined>();
			const counts = ['SIGINT', 'SIGTERM'].map((name) =>
				process.listenerCount(name)
			);
			install.mockImplementationOnce(
				async (_root, _dependencies, _manager, signal: AbortSignal) => {
					started.resolve(undefined);
					signal.addEventListener('abort', () => aborted.resolve(undefined), {
						once: true,
					});
					await closed.promise;
					signal.throwIfAborted();
				}
			);
			let finished = false;
			const result = (async () => {
				try {
					return await run(context);
				} catch (error) {
					return error;
				} finally {
					finished = true;
				}
			})();
			await started.promise;
			process.emit(signalName);
			await aborted.promise;
			expect(finished).toBe(false);
			expect(
				await readFile(join(context.projectRoot, 'c15t.config.ts'), 'utf8')
			).toContain('createConsentKernel');
			closed.resolve(undefined);
			expect(await result).toMatchObject({ code: 'CANCELLED' });
			expect(await readdir(context.projectRoot)).toEqual(['package.json']);
			expect(
				['SIGINT', 'SIGTERM'].map((name) => process.listenerCount(name))
			).toEqual(counts);
		}
	);
	it('defaults to a structured plan without filesystem or installation changes', async () => {
		const context = await fixture();
		const result = await run(context);
		expect(result.applied).toBe(false);
		expect(result.edits).toHaveLength(1);
		expect(await readdir(context.projectRoot)).toEqual(['package.json']);
		expect(install).not.toHaveBeenCalled();
	});
	it('applies files with skip-install and removes the recovery journal', async () => {
		const context = await fixture({ apply: true, 'skip-install': true });
		const result = await run(context);
		expect(result.applied).toBe(true);
		expect(
			await readFile(join(context.projectRoot, 'c15t.config.ts'), 'utf8')
		).toContain('createConsentKernel');
		expect(await readdir(context.projectRoot)).toEqual([
			'c15t.config.ts',
			'package.json',
		]);
		expect(install).not.toHaveBeenCalled();
	});
	it.each([false, true])(
		'redacts existing environment contents when apply=%s',
		async (apply) => {
			const context = await fixture({
				apply,
				'backend-url': 'https://consent.example.com',
				env: true,
				json: true,
				plan: !apply,
				'skip-install': true,
			});
			context.commandArgs = ['hosted'];
			const envPath = join(context.projectRoot, '.env.local');
			const examplePath = join(context.projectRoot, '.env.example');
			const secret = 'PRIVATE_KEY=local-secret-must-not-leak\n';
			const exampleSecret = 'PRIVATE_KEY=example-secret-must-not-leak\n';
			await writeFile(envPath, secret);
			await writeFile(examplePath, exampleSecret);
			const result = await run(context);
			const output = JSON.stringify(result);
			expect(output).not.toContain('local-secret-must-not-leak');
			expect(output).not.toContain('example-secret-must-not-leak');
			expect(
				result.edits.filter(
					(edit) => edit.path === envPath || edit.path === examplePath
				)
			).toEqual([
				{ operation: 'update', path: envPath, redacted: true },
				{ operation: 'update', path: examplePath, redacted: true },
			]);
			expect(await readFile(envPath, 'utf8')).toBe(
				secret +
					(apply ? '\nPUBLIC_C15T_URL=https://consent.example.com\n' : '')
			);
			expect(await readFile(examplePath, 'utf8')).toBe(
				exampleSecret +
					(apply
						? '\n# c15t Configuration\nPUBLIC_C15T_URL=https://your-project.inth.app\n'
						: '')
			);
			expect(install).not.toHaveBeenCalled();
		}
	);
	it('returns safe create metadata for new environment files', async () => {
		const context = await fixture({
			'backend-url': 'https://consent.example.com',
			env: true,
			plan: true,
		});
		context.commandArgs = ['hosted'];
		const result = await run(context);
		expect(result.edits).toContainEqual({
			operation: 'create',
			path: join(context.projectRoot, '.env.local'),
			redacted: true,
		});
		expect(await readdir(context.projectRoot)).toEqual(['package.json']);
	});
	it('restores generated files when dependency installation fails', async () => {
		install.mockRejectedValueOnce(new Error('installation failed'));
		const context = await fixture({ apply: true });
		await expect(run(context)).rejects.toMatchObject({
			code: 'CONFIG_INVALID',
		});
		expect(await readdir(context.projectRoot)).toEqual(['package.json']);
	});
	it.each([
		{ apply: true, plan: true },
		{ plan: true, resume: true },
		{ resume: true },
		{ mode: 'hosted' },
		{ env: true },
		{ 'backend-url': 'https://example.com', project: 'example' },
	])('rejects conflicting setup options %j', async (flags) => {
		const context = await fixture(flags);
		await expect(run(context)).rejects.toMatchObject({
			code: 'FLAG_INVALID',
		});
		expect(await readdir(context.projectRoot)).toEqual(['package.json']);
	});
});
