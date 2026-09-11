import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import * as packageManagerDetection from '../../context/package-manager-detection';
import { createCliLogger, runCli } from '../../index';
import * as generateRunner from '../../machines/generate/runner';

const { detectPackageManager } = packageManagerDetection;
const packageManagerDetectionSpy = vi
	.spyOn(packageManagerDetection, 'detectPackageManager')
	.mockImplementation((root, logger, interactive) => {
		if (interactive) {
			return Promise.reject(new Error('Package manager prompt sentinel'));
		}
		return detectPackageManager(root, logger, interactive);
	});

const interactiveRunner = vi
	.spyOn(generateRunner, 'runGenerateMachine')
	.mockRejectedValue(new Error('Interactive setup sentinel'));

// Load the actual flag-aware AST workflow outside individual test deadlines.
beforeAll(async () => {
	await import('./non-interactive');
}, 30_000);

const directories: string[] = [];
const manifest = '{"name":"fixture","private":true}';
const fixture = async () => {
	const cwd = await mkdtemp(join(tmpdir(), 'c15t-setup-routing-'));
	directories.push(cwd);
	await writeFile(join(cwd, 'package.json'), manifest);
	return cwd;
};
const run = (cwd: string, args: string[]) =>
	runCli(['setup', ...args], {
		cwd,
		interactive: true,
		logger: createCliLogger('error', { write: () => {} }),
	});
afterEach(async () => {
	vi.clearAllMocks();
	await Promise.all(
		directories
			.splice(0)
			.map((cwd) => rm(cwd, { force: true, recursive: true }))
	);
});

describe('setup routing in an interactive terminal', () => {
	it('uses an explicit backend URL in a read-only plan without starting interactive setup', async () => {
		const cwd = await fixture();
		const backendURL = 'https://explicit-backend.example.com';
		const result = await run(cwd, ['hosted', '--backend-url', backendURL]);
		expect(result).toMatchObject({
			data: {
				applied: false,
				edits: expect.arrayContaining([
					expect.objectContaining({
						after: expect.stringContaining(backendURL),
					}),
				]),
				mode: 'hosted',
			},
			success: true,
		});
		expect(interactiveRunner).not.toHaveBeenCalled();
		expect(packageManagerDetectionSpy).toHaveBeenCalledWith(
			cwd,
			expect.anything(),
			false
		);
		expect(await readdir(cwd)).toEqual(['package.json']);
		expect(await readFile(join(cwd, 'package.json'), 'utf8')).toBe(manifest);
	});

	it('includes explicitly selected scripts in the plan without applying it', async () => {
		const cwd = await fixture();
		expect(
			await run(cwd, ['offline', '--scripts', 'google-tag'])
		).toMatchObject({
			data: {
				applied: false,
				dependencies: expect.arrayContaining(['@c15t/scripts']),
				edits: expect.arrayContaining([
					expect.objectContaining({
						after: expect.stringContaining("from '@c15t/scripts/google-tag'"),
					}),
				]),
			},
			success: true,
		});
		expect(interactiveRunner).not.toHaveBeenCalled();
		expect(packageManagerDetectionSpy).toHaveBeenCalledWith(
			cwd,
			expect.anything(),
			false
		);
		expect(await readdir(cwd)).toEqual(['package.json']);
	});

	it.each([
		'env',
		'proxy',
		'ssr',
		'devtools',
		'skip-install',
		'apply',
		'plan',
		'dry-run',
	])(
		'honors explicit --%s=false without entering the interactive workflow',
		async (flag) => {
			const cwd = await fixture();
			expect(await run(cwd, ['offline', `--${flag}=false`])).toMatchObject({
				data: { applied: false, mode: 'offline' },
				success: true,
			});
			expect(interactiveRunner).not.toHaveBeenCalled();
			expect(packageManagerDetectionSpy).toHaveBeenCalledWith(
				cwd,
				expect.anything(),
				false
			);
			expect(await readdir(cwd)).toEqual(['package.json']);
		}
	);

	it('keeps a setup invocation without configuration flags interactive', async () => {
		const cwd = await fixture();
		await writeFile(
			join(cwd, 'package.json'),
			JSON.stringify({ name: 'fixture', packageManager: 'npm@11.4.0' })
		);
		packageManagerDetectionSpy.mockImplementationOnce(detectPackageManager);
		expect(await run(cwd, ['offline'])).toMatchObject({ success: false });
		expect(interactiveRunner).toHaveBeenCalledOnce();
		expect(interactiveRunner).toHaveBeenCalledWith(
			expect.objectContaining({ modeArg: 'offline' })
		);
	});

	it('keeps package-manager selection for bare interactive setup', async () => {
		const cwd = await fixture();
		expect(await run(cwd, ['offline'])).toMatchObject({ success: false });
		expect(packageManagerDetectionSpy).toHaveBeenCalledOnce();
		expect(packageManagerDetectionSpy).toHaveBeenCalledWith(
			cwd,
			expect.anything(),
			true
		);
		expect(interactiveRunner).not.toHaveBeenCalled();
	});

	it.each([
		['setup', '--framework', 'javascript'],
		['generate', '--boilerplate'],
		['generate', '--output', 'src/privacy'],
	])('previews %s %s without asking for a package manager', async (...args) => {
		const cwd = await fixture();
		const result = await runCli([args[0], 'offline', ...args.slice(1)], {
			cwd,
			interactive: true,
			logger: createCliLogger('error', { write: () => {} }),
		});
		expect(result).toMatchObject({ data: { applied: false }, success: true });
		expect(packageManagerDetectionSpy).toHaveBeenCalledWith(
			cwd,
			expect.anything(),
			false
		);
		expect(interactiveRunner).not.toHaveBeenCalled();
		expect(await readdir(cwd)).toEqual(['package.json']);
	});

	it.each([
		{ flag: '--project', value: 'example' },
		{ flag: '--ui-style', value: 'unknown' },
		{ flag: '--theme', value: 'unknown' },
	])(
		'validates $flag instead of silently dropping it in the interactive workflow',
		async ({ flag, value }) => {
			const cwd = await fixture();
			expect(await run(cwd, ['offline', flag, value])).toMatchObject({
				error: { code: 'FLAG_INVALID' },
				success: false,
			});
			expect(interactiveRunner).not.toHaveBeenCalled();
			expect(packageManagerDetectionSpy).toHaveBeenCalledWith(
				cwd,
				expect.anything(),
				false
			);
			expect(await readdir(cwd)).toEqual(['package.json']);
		}
	);
});
