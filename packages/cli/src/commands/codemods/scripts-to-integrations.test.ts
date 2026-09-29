import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runScriptsToIntegrationsCodemod } from './scripts-to-integrations';

const directories: string[] = [];
const fixture = async (source: string, extension = 'ts') => {
	const projectRoot = await mkdtemp(join(tmpdir(), 'c15t-integration-rename-'));
	directories.push(projectRoot);
	const filePath = join(projectRoot, `config.${extension}`);
	await writeFile(filePath, source);
	return { filePath, projectRoot };
};

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('scripts-to-integrations', () => {
	it('rewrites imports, re-exports, dynamic imports, require calls and import types', async () => {
		const source = `import { posthog as analytics } from '@c15t/scripts/posthog';
import type { VendorManifest } from '@c15t/scripts/types';
import '@c15t/scripts/events';
export { gtag } from '@c15t/scripts/google-tag';
export * from '@c15t/scripts/registry';
const lazy = import('@c15t/scripts/meta-pixel');
const events = require('@c15t/scripts/events');
type Manifest = import('@c15t/scripts/types').VendorManifest;
const scripts = [analytics({ token: 'test' })];
`;
		const { filePath, projectRoot } = await fixture(source);
		const result = await runScriptsToIntegrationsCodemod({
			dryRun: false,
			projectRoot,
		});
		expect(result.errors).toEqual([]);
		expect(result.changedFiles).toHaveLength(1);
		expect(result.changedFiles[0]?.operations).toBe(8);
		expect(await readFile(filePath, 'utf8')).toBe(
			source.replaceAll('@c15t/scripts/', '@c15t/integrations/')
		);
		expect(
			(await runScriptsToIntegrationsCodemod({ dryRun: false, projectRoot }))
				.changedFiles
		).toEqual([]);
	});

	it('previews JavaScript changes without saving files', async () => {
		const source = `export { posthog } from '@c15t/scripts/posthog';\n`;
		const { filePath, projectRoot } = await fixture(source, 'js');
		const result = await runScriptsToIntegrationsCodemod({
			dryRun: true,
			projectRoot,
		});
		expect(result.errors).toEqual([]);
		expect(result.changedFiles[0]).toMatchObject({
			after: source.replace('@c15t/scripts', '@c15t/integrations'),
			before: source,
		});
		expect(await readFile(filePath, 'utf8')).toBe(source);
	});

	it('leaves unrelated packages, strings, comments and shadowed require calls alone', async () => {
		const source = `import '@c15t/scripts-extra';
import { posthog } from '@c15t/integrations/posthog';
const example = '@c15t/scripts/posthog';
// import '@c15t/scripts/events';
function custom(require: (value: string) => string) {
  return require('@c15t/scripts/events');
}
`;
		const { filePath, projectRoot } = await fixture(source);
		const result = await runScriptsToIntegrationsCodemod({
			dryRun: false,
			projectRoot,
		});
		expect(result.errors).toEqual([]);
		expect(result.changedFiles).toEqual([]);
		expect(await readFile(filePath, 'utf8')).toBe(source);
	});
});
