import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { afterEach, expect, it, vi } from 'vitest';
import { createActor, fromPromise, toPromise } from 'xstate';

import { createCliContext } from '../../../context/creator';
import { createCliLogger } from '../../../utils/logger';
import { generateMachine } from '../machine';
import { setupCancelHandler } from '../runner';
import { runPackageManagerInstall } from './dependencies';

const directories: string[] = [];
afterEach(async () => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

it('rejects an already cancelled install before spawning a package manager', async () => {
	const controller = new AbortController();
	controller.abort(new Error('cancelled'));
	await expect(
		runPackageManagerInstall('/nonexistent', ['c15t'], 'npm', controller.signal)
	).rejects.toThrow('cancelled');
});

it.skipIf(process.platform === 'win32').each(['SIGINT', 'SIGTERM'] as const)(
	'waits for the installer and stops lifecycle writes before rollback on %s',
	async (signal) => {
		const directory = await mkdtemp(join(tmpdir(), 'c15t-installer-cancel-'));
		directories.push(directory);
		await writeFile(join(directory, 'package.json'), '{"private":true}');
		const npm = join(directory, 'npm');
		await writeFile(
			npm,
			`#!${process.execPath}
const fs = require('node:fs');
const { spawn } = require('node:child_process');
spawn(process.execPath, ['-e', \`
 const fs = require('node:fs');
 process.on('SIGTERM', () => {});
 setInterval(() => fs.writeFileSync('generated.txt', 'lifecycle write'), 5);
 fs.writeFileSync('lifecycle-ready', 'ready');
\`], { stdio: 'ignore' });
process.on('SIGTERM', () => {
 fs.writeFileSync('terminating', 'yes');
 setTimeout(() => {
  fs.writeFileSync('installer-closed', 'yes');
  process.exit(0);
 }, 80);
});
setInterval(() => {}, 1000);
`
		);
		await chmod(npm, 0o755);
		vi.stubEnv('PATH', `${directory}:${process.env.PATH}`);
		const cliContext = await createCliContext([], directory, [], {
			logger: createCliLogger('error', { write: () => {} }),
			telemetry: false,
		});
		cliContext.packageManager = { name: 'npm', version: null };
		const rollback = vi.fn(async () => {
			expect(await readFile(join(directory, 'installer-closed'), 'utf8')).toBe(
				'yes'
			);
			await writeFile(join(directory, 'generated.txt'), 'restored');
			return { errors: [], success: true };
		});
		const machine = generateMachine.provide({
			actors: {
				fileGeneration: fromPromise(() =>
					Promise.resolve({
						configPath: null,
						envPath: null,
						filesCreated: [join(directory, 'generated.txt')],
						filesModified: [],
						layoutPath: null,
						nextConfigPath: null,
					})
				),
				frontendOptions: fromPromise(() =>
					Promise.resolve({
						uiStyle: 'prebuilt' as const,
					})
				),
				installConfirm: fromPromise(() => Promise.resolve({ confirmed: true })),
				preflight: fromPromise(() =>
					Promise.resolve({
						checks: [],
						framework: cliContext.framework,
						packageManager: cliContext.packageManager,
						passed: true,
						projectRoot: directory,
					})
				),
				rollback: fromPromise(rollback),
				scriptsOption: fromPromise(() =>
					Promise.resolve({
						addScripts: false,
						selectedScripts: [],
					})
				),
			},
		});
		const actor = createActor(machine, {
			input: { cliContext, modeArg: 'offline' },
		});
		setupCancelHandler(actor);
		actor.start();
		actor.send({ type: 'START' });
		try {
			await vi.waitFor(async () =>
				expect(await readFile(join(directory, 'lifecycle-ready'), 'utf8')).toBe(
					'ready'
				)
			);
			const finished = toPromise(actor);
			process.emit(signal);
			expect(rollback).not.toHaveBeenCalled();
			await finished;
			expect(rollback).toHaveBeenCalledOnce();
			expect(actor.getSnapshot().context.cleanupDone).toBe(true);
			await delay(100);
			expect(await readFile(join(directory, 'generated.txt'), 'utf8')).toBe(
				'restored'
			);
		} finally {
			actor.send({ type: 'CANCEL' });
			actor.stop();
		}
	},
	10_000
);
