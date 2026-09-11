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
