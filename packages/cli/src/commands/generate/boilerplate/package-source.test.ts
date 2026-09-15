import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCli } from '../../../index';
import { applyFileEdits } from '../templates/shared/file-plan';
import {
	planBoilerplateDependencies,
	prepareBoilerplatePackages,
} from './package-source';

const execute = promisify(execFile);
let fixture: string;
let checkout: string;
let app: string;
const version = '2.2.0-canary-20260731105620';
const rootName = '@c15t/local-root';
const writePackage = async (
	name: string,
	dependencies: Record<string, string>,
	content: string
) => {
	const directory = path.join(
		checkout,
		'packages',
		name.slice('@c15t/'.length)
	);
	await fs.mkdir(path.join(directory, 'dist'), { recursive: true });
	await fs.writeFile(path.join(directory, 'dist/index.js'), content);
	await fs.writeFile(
		path.join(directory, 'package.json'),
		JSON.stringify({
			dependencies,
			exports: './dist/index.js',
			files: ['dist'],
			name,
			type: 'module',
			version,
		})
	);
};
beforeEach(async () => {
	fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'c15t-local-source-'));
	checkout = path.join(fixture, 'checkout');
	app = path.join(fixture, 'app');
	await fs.mkdir(app, { recursive: true });
	await fs.mkdir(checkout);
	await fs.writeFile(
		path.join(checkout, 'package.json'),
		'{"name":"c15t-workspace","private":true}'
	);
	await writePackage(
		'@c15t/local-leaf',
		{},
		'export const marker = "local-v3";'
	);
	await writePackage(
		'@c15t/local-mid',
		{ '@c15t/local-leaf': 'workspace:*' },
		'export {marker} from "@c15t/local-leaf";'
	);
	await writePackage(
		rootName,
		{ '@c15t/local-leaf': 'workspace:*', '@c15t/local-mid': 'workspace:*' },
		'export {marker} from "@c15t/local-mid";'
	);
});
afterEach(async () => {
	await fs.rm(fixture, { force: true, recursive: true });
});

describe('local unpublished package sources', () => {
	it('does not add registry versions or touch package.json without a source', async () => {
		const plan = await planBoilerplateDependencies({
			dependencies: ['c15t'],
			projectRoot: app,
		});
		expect(plan.dependencies).toEqual([{ name: 'c15t', specifier: null }]);
		expect(plan.edits).toEqual([]);
		expect(await fs.readdir(app)).toEqual([]);
	});
	it('keeps external framework prerequisites out of the preparation command', async () => {
		const plan = await planBoilerplateDependencies({
			dependencies: [rootName, '@astrojs/svelte', 'svelte'],
			projectRoot: app,
		});
		const preparation = plan.instructions.find((line) =>
			line.includes('prepare-cli-packages')
		);
		expect(preparation).toContain(
			`prepare-cli-packages.ts ${rootName} after building`
		);
		expect(preparation).not.toContain('svelte');
		expect(plan.instructions).toContain(
			'External dependency @astrojs/svelte must be installed separately; its existing version was not changed.'
		);
		expect(plan.instructions).toContain(
			'External dependency svelte must be installed separately; its existing version was not changed.'
		);
	});
	it('suggests only local packages when the prepared snapshot is missing', async () => {
		const planning = planBoilerplateDependencies({
			dependencies: [rootName, '@astrojs/svelte', 'svelte'],
			packageSource: checkout,
			projectRoot: app,
		});
		await expect(planning).rejects.toThrow(
			`prepare-cli-packages.ts ${rootName} after building`
		);
		await expect(planning).rejects.toMatchObject({
			message: expect.not.stringContaining('svelte'),
		});
	});
	it('requires a prepared built snapshot', async () => {
		await expect(
			planBoilerplateDependencies({
				dependencies: [rootName],
				packageSource: checkout,
				projectRoot: app,
			})
		).rejects.toThrow('prepare-cli-packages');
		await fs.rm(path.join(checkout, 'packages/local-root/dist/index.js'));
		await expect(
			prepareBoilerplatePackages({
				dependencies: [rootName],
				packageSource: checkout,
			})
		).rejects.toThrow('Build @c15t/local-root');
	});
	it('installs a diamond closure with Bun and resolves its local API in Node', async () => {
		const prepared = await prepareBoilerplatePackages({
			dependencies: [rootName],
			packageSource: checkout,
		});
		expect(prepared.closure).toHaveLength(3);
		const plan = await planBoilerplateDependencies({
			dependencies: [rootName],
			packageSource: checkout,
			projectRoot: app,
		});
		expect(plan.dependencies).toHaveLength(3);
		expect(await fs.readdir(app)).toEqual([]);
		await applyFileEdits(plan.edits);
		await execute('bun', ['install', '--ignore-scripts'], { cwd: app });
		const result = await execute(
			'node',
			[
				'--input-type=module',
				'-e',
				`import {marker} from '${rootName}'; console.log(marker);`,
			],
			{ cwd: app }
		);
		expect(result.stdout.trim()).toBe('local-v3');
		const installed = JSON.parse(
			await fs.readFile(
				path.join(app, 'node_modules/@c15t/local-root/package.json'),
				'utf8'
			)
		);
		expect(installed.version).toBe(version);
		expect(installed.dependencies).toEqual({});
		expect(installed.c15tLocalSnapshot.requires).toEqual([
			'@c15t/local-leaf',
			'@c15t/local-mid',
		]);
	}, 30_000);
	it('preserves project metadata and external dependency versions', async () => {
		await prepareBoilerplatePackages({
			dependencies: [rootName],
			packageSource: checkout,
		});
		await fs.writeFile(
			path.join(app, 'package.json'),
			JSON.stringify({
				dependencies: { svelte: '5.0.0' },
				name: 'existing',
				scripts: { dev: 'vite' },
			})
		);
		const plan = await planBoilerplateDependencies({
			dependencies: [rootName, 'svelte', '@astrojs/svelte'],
			packageSource: checkout,
			projectRoot: app,
		});
		const after = JSON.parse(plan.edits[0]?.after ?? '{}');
		expect(after).toMatchObject({
			dependencies: { svelte: '5.0.0' },
			name: 'existing',
			scripts: { dev: 'vite' },
		});
		expect(after.dependencies['@astrojs/svelte']).toBeUndefined();
		expect(plan.dependencies).toContainEqual({
			name: '@astrojs/svelte',
			specifier: null,
		});
	});
	it('refreshes generated app dependencies after preparing a new local snapshot', async () => {
		await writePackage(
			'@c15t/react',
			{ [rootName]: 'workspace:*' },
			'export {};'
		);
		await fs.writeFile(path.join(app, 'package.json'), '{"private":true}');
		const args = [
			'generate',
			'offline',
			'--framework',
			'react',
			'--package-source',
			checkout,
			'--apply',
			'--json',
		];
		const first = await prepareBoilerplatePackages({
			dependencies: ['@c15t/react'],
			packageSource: checkout,
		});
		expect(await runCli(args, { cwd: app })).toMatchObject({ success: true });
		const readmePath = path.join(app, 'src/consent/README.md');
		const readme = await fs.readFile(readmePath, 'utf8');
		await writePackage(
			'@c15t/react',
			{ [rootName]: 'workspace:*' },
			'export const updated = true;'
		);
		const second = await prepareBoilerplatePackages({
			dependencies: ['@c15t/react'],
			packageSource: checkout,
		});
		expect(second.preparedAt).not.toBe(first.preparedAt);
		expect(second.packages['@c15t/react']?.tarball).not.toBe(
			first.packages['@c15t/react']?.tarball
		);
		const refreshed = await runCli(args, { cwd: app });
		expect(refreshed, JSON.stringify(refreshed)).toMatchObject({
			data: {
				applied: true,
				edits: [{ path: path.join(app, 'package.json') }],
				source: { preparedAt: second.preparedAt },
			},
			success: true,
		});
		const manifest = JSON.parse(
			await fs.readFile(path.join(app, 'package.json'), 'utf8')
		);
		for (const [name, archive] of Object.entries(second.packages)) {
			expect(manifest.dependencies[name]).toBe(`file:${archive.tarball}`);
		}
		expect(await fs.readFile(readmePath, 'utf8')).toBe(readme);
		expect(await runCli(args, { cwd: app })).toMatchObject({
			data: { edits: [] },
			success: true,
		});
	}, 30_000);
	it('rejects altered local archives before planning installation', async () => {
		const prepared = await prepareBoilerplatePackages({
			dependencies: [rootName],
			packageSource: checkout,
		});
		const archive = prepared.packages[rootName];
		if (!archive) {
			throw new Error('Missing test archive');
		}
		await fs.appendFile(archive.tarball, 'changed');
		await expect(
			planBoilerplateDependencies({
				dependencies: [rootName],
				packageSource: checkout,
				projectRoot: app,
			})
		).rejects.toThrow('missing or changed');
	});
});
