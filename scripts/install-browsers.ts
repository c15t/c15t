import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { runCommand } from './browser-process';
import { readWorkspaces } from './ci-plan';

/** Resolve installed versions from each consumer, including nested Bun installs. */
export const browserInstallations = function browserInstallations(root = '.') {
	const installations = new Map<string, string>();
	const directories = [
		'.',
		...readWorkspaces(root).map((item) => item.directory),
	];
	for (const directory of directories) {
		const manifestPath = resolve(root, directory, 'package.json');
		const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
		const dependencies = {
			...manifest.dependencies,
			...manifest.devDependencies,
		};
		const require = createRequire(manifestPath);
		for (const name of ['playwright', '@playwright/test']) {
			if (!dependencies[name]) {
				continue;
			}
			const installedPath = require.resolve(`${name}/package.json`);
			const installed = JSON.parse(readFileSync(installedPath, 'utf8'));
			installations.set(
				installed.version,
				join(dirname(installedPath), 'cli.js')
			);
		}
	}
	if (!installations.size) {
		throw new Error(`No installed Playwright consumers found in ${root}`);
	}
	return installations;
};

export const installBrowsers = async function installBrowsers(
	root = '.',
	withDependencies = false
) {
	for (const [version, cli] of browserInstallations(root)) {
		process.stdout.write(`Installing Chromium for Playwright ${version}.\n`);
		// oxlint-disable-next-line no-await-in-loop -- Apt and browser installations share locks.
		await runCommand([
			'bun',
			cli,
			'install',
			...(withDependencies ? ['--with-deps'] : []),
			'chromium',
		]);
	}
};

if (import.meta.main) {
	await installBrowsers('.', process.argv.includes('--with-deps'));
}
