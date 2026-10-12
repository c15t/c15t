import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
	checkInstalledDependencies,
	getManualInstallCommand,
	runPackageManagerInstall,
} from '../../machines/generate/actors/dependencies';

describe('v3 dependency installation', () => {
	it
		.skipIf(process.platform === 'win32')
		.each(['npm', 'pnpm', 'yarn', 'bun'] as const)(
		'installs alpha packages through %s',
		async (manager) => {
			const directory = await mkdtemp(join(tmpdir(), 'c15t-install-'));
			const originalPath = process.env.PATH;
			try {
				const executable = join(directory, manager);
				await writeFile(
					executable,
					'#!/bin/sh\nprintf "%s\\n" "$@" > installer-args\n'
				);
				await chmod(executable, 0o755);
				process.env.PATH = `${directory}${delimiter}${originalPath ?? ''}`;
				await runPackageManagerInstall(
					directory,
					['c15t', '@c15t/integrations', '@c15t/ui', '@effect/sql-pg'],
					manager
				);
				expect(
					(await readFile(join(directory, 'installer-args'), 'utf8'))
						.trim()
						.split('\n')
				).toEqual([
					manager === 'npm' ? 'install' : 'add',
					'c15t@alpha',
					'@c15t/integrations@alpha',
					'@c15t/ui@alpha',
					'@effect/sql-pg',
				]);
				expect(
					getManualInstallCommand(['c15t', '@c15t/integrations'], manager)
				).toContain('c15t@alpha @c15t/integrations@alpha');
			} finally {
				if (originalPath === undefined) {
					delete process.env.PATH;
				} else {
					process.env.PATH = originalPath;
				}
				await rm(directory, { force: true, recursive: true });
			}
		}
	);

	it('looks up tagged scoped dependencies by their package name', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'c15t-dependencies-'));
		try {
			await writeFile(
				join(directory, 'package.json'),
				JSON.stringify({
					dependencies: { '@c15t/react': '3.0.0-alpha.3' },
				})
			);
			expect(
				await checkInstalledDependencies({
					dependencies: ['@c15t/react@alpha', '@c15t/integrations@alpha'],
					projectRoot: directory,
				})
			).toEqual({
				installed: ['@c15t/react@alpha'],
				missing: ['@c15t/integrations@alpha'],
			});
		} finally {
			await rm(directory, { force: true, recursive: true });
		}
	});
});
