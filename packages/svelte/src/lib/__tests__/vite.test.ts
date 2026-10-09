import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import { MODULE_PRELOAD_PLACEHOLDERS } from '../kit/module-preload';
import { c15tPreload, consentManifest, resolveChunkHrefs } from '../vite';

const CORE = '/app/node_modules/@c15t/core/dist/modules';

const chunk = (
	fileName: string,
	moduleIds: string[],
	isEntry = false
): { type: 'chunk' } => ({
	fileName,
	isEntry,
	moduleIds,
	type: 'chunk',
});

const CLIENT_BUNDLE = {
	'_app/immutable/chunks/a.js': chunk('_app/immutable/chunks/a.js', [
		`${CORE}/script-loader/loader.js`,
		`${CORE}/network-blocker/blocker.js`,
		`${CORE}/loader-and-blocker.js`,
	]),
	'_app/immutable/entry/app.js': chunk(
		'_app/immutable/entry/app.js',
		[`${CORE}/script-loader/tools.js`],
		true
	),
	'style.css': { type: 'asset' },
};

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('Svelte manifest module', () => {
	test.each([
		{ app: 'Svelte single-page app', plugins: [], snapshotInBrowser: true },
		{
			app: 'SvelteKit app',
			plugins: [{ name: 'vite-plugin-sveltekit-setup' }],
			snapshotInBrowser: false,
		},
	])(
		'a $app gets the snapshot in the browser: $snapshotInBrowser',
		async ({ plugins, snapshotInBrowser }) => {
			const root = await mkdtemp(path.join(tmpdir(), 'c15t-svelte-manifest-'));
			directories.push(root);
			const plugin = consentManifest({
				backendURL: 'https://consent.example.com',
				fetch: () =>
					Promise.resolve(
						Response.json({
							branding: 'c15t',
							revision: 'svelte-build',
							schemaVersion: 2,
						})
					),
			});
			await plugin.configResolved({ plugins, root });
			const load = (consumer: 'client' | 'server') =>
				plugin.load.call(
					{ environment: { config: { consumer } } },
					plugin.resolveId('@c15t/core/generated') as string
				);
			expect((await load('client'))?.includes('svelte-build')).toBe(
				snapshotInBrowser
			);
			expect(await load('server')).toContain('svelte-build');
		}
	);
});

describe('resolveChunkHrefs', () => {
	test('finds the loader-and-blocker chunk under the served base', () => {
		expect(resolveChunkHrefs(CLIENT_BUNDLE, '/docs')).toEqual({
			'loader-and-blocker': '/docs/_app/immutable/chunks/a.js',
		});
	});

	test('names no URL for a module the entry chunk carries', () => {
		const bundle = {
			'app.js': chunk(
				'app.js',
				[
					`${CORE}/script-loader/loader.js`,
					`${CORE}/network-blocker/blocker.js`,
					`${CORE}/loader-and-blocker.js`,
				],
				true
			),
		};
		expect(resolveChunkHrefs(bundle, '')).toEqual({
			'loader-and-blocker': '',
		});
	});
});

describe('c15tPreload', () => {
	const setup = async function setup() {
		const root = await mkdtemp(path.join(tmpdir(), 'c15t-preload-'));
		directories.push(root);
		const server = path.join(root, '.svelte-kit', 'output', 'server');
		await mkdir(path.join(server, 'chunks'), { recursive: true });
		const file = path.join(server, 'chunks', 'hooks.js');
		await writeFile(
			file,
			`const hrefs = ${JSON.stringify(MODULE_PRELOAD_PLACEHOLDERS)};`
		);
		const plugin = c15tPreload();
		const configure = (ssr: boolean) =>
			plugin.configResolved({
				build: { ssr },
				plugins: [
					{
						api: {
							options: { kit: { outDir: '.svelte-kit', paths: { base: '' } } },
						},
						name: 'vite-plugin-sveltekit-setup',
					},
				],
				root,
			});
		return { configure, file, plugin };
	};

	test('writes the client chunk URLs into the server output', async () => {
		const { configure, file, plugin } = await setup();
		configure(false);
		await plugin.writeBundle.call({}, {}, CLIENT_BUNDLE);
		expect(await readFile(file, 'utf8')).toBe(
			`const hrefs = ${JSON.stringify({
				'loader-and-blocker': '/_app/immutable/chunks/a.js',
			})};`
		);
	});

	test('leaves the server output alone during the server build', async () => {
		const { configure, file, plugin } = await setup();
		configure(true);
		await plugin.writeBundle.call({}, {}, CLIENT_BUNDLE);
		configure(false);
		await plugin.writeBundle.call(
			{ environment: { name: 'ssr' } },
			{},
			CLIENT_BUNDLE
		);
		expect(await readFile(file, 'utf8')).toContain(
			MODULE_PRELOAD_PLACEHOLDERS['loader-and-blocker']
		);

		await plugin.writeBundle.call(
			{ environment: { name: 'client' } },
			{},
			CLIENT_BUNDLE
		);
		expect(await readFile(file, 'utf8')).toContain(
			'/_app/immutable/chunks/a.js'
		);
	});

	test('reads SvelteKit 3 options, which are not nested under kit', async () => {
		const { file } = await setup();
		const plugin = c15tPreload();
		plugin.configResolved({
			build: {},
			plugins: [
				{
					api: { options: { outDir: '.svelte-kit', paths: { base: '/app' } } },
					name: 'vite-plugin-sveltekit-setup',
				},
			],
			root: path.resolve(path.dirname(file), '../../../..'),
		});
		await plugin.writeBundle.call(
			{ environment: { name: 'client' } },
			{},
			CLIENT_BUNDLE
		);
		expect(await readFile(file, 'utf8')).toContain(
			'/app/_app/immutable/chunks/a.js'
		);
	});

	test('does nothing outside SvelteKit', async () => {
		const { file } = await setup();
		const plugin = c15tPreload();
		plugin.configResolved({
			build: {},
			plugins: [],
			root: path.dirname(file),
		});
		await plugin.writeBundle.call({}, {}, CLIENT_BUNDLE);
		expect(await readFile(file, 'utf8')).toContain(
			MODULE_PRELOAD_PLACEHOLDERS['loader-and-blocker']
		);
	});
});
