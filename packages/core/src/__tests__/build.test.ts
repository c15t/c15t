import { mkdtemp, readFile, rm, stat, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { build } from 'vite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	consentManifest,
	loadBuildManifest,
	writeManifestModule,
} from '../build';

const MANIFEST_FIXTURE = {
	branding: 'c15t',
	revision: 'build-test',
	schemaVersion: 2,
};

const directories: string[] = [];
const createRoot = async () => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-manifest-'));
	directories.push(root);
	return root;
};

const optionsFor = (rootDir: string) => ({
	backendURL: 'https://consent.example.com',
	fetch: vi
		.fn<typeof globalThis.fetch>()
		.mockImplementation(() => Promise.resolve(Response.json(MANIFEST_FIXTURE))),
	rootDir,
});

afterEach(async () => {
	await Promise.all(
		directories.splice(0).map((path) =>
			rm(path, {
				force: true,
				recursive: true,
			})
		)
	);
});

describe('Vite build-time manifest', () => {
	test('a real Vite build generates the imported module before compiling', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		await build({
			build: {
				lib: {
					entry: join(root, 'src/c15t-manifest.ts'),
					formats: ['es'],
				},
				write: false,
			},
			configFile: false,
			logLevel: 'silent',
			plugins: [consentManifest(options)],
			root,
		});
		const source = await readFile(join(root, 'src/c15t-manifest.ts'), 'utf8');
		expect(source).toContain("from 'c15t/build'");
		expect(options.fetch).toHaveBeenCalledTimes(1);
	});

	test('uses Vite root and supports custom module settings', async () => {
		const root = await createRoot();
		const { fetch, backendURL } = optionsFor(root);
		await consentManifest({
			backendURL,
			exportName: 'deploymentManifest',
			fetch,
			importSource: '@c15t/core/build',
			outputFile: 'generated/manifest.ts',
		}).configResolved({ root });
		const source = await readFile(join(root, 'generated/manifest.ts'), 'utf8');
		expect(source).toContain("from '@c15t/core/build'");
		expect(source).toContain('export const deploymentManifest =');
	});
});

describe('manifest output', () => {
	const defaults = {
		importSource: 'c15t/build',
		label: 'test/build',
		outputFile: 'generated/manifest.ts',
	};

	test.each([
		['https://consent.example.com', 'https://consent.example.com/manifest'],
		['https://consent.example.com/', 'https://consent.example.com/manifest'],
		[
			'https://consent.example.com/api/c15t///',
			'https://consent.example.com/api/c15t/manifest',
		],
		[
			'https://consent.example.com/api/?key=x#config',
			'https://consent.example.com/api/manifest?key=x#config',
		],
	])(
		'fetches /manifest under backendURL %s',
		async (backendURL, manifestURL) => {
			const options = optionsFor(await createRoot());
			await writeManifestModule({ ...options, backendURL }, defaults);
			expect(options.fetch).toHaveBeenCalledWith(
				manifestURL,
				expect.any(Object)
			);
		}
	);

	test.each(['/api/c15t', 'file:///backend', ''])(
		'rejects a backendURL the build cannot fetch: %s',
		async (backendURL) => {
			const options = optionsFor(await createRoot());
			await expect(
				writeManifestModule({ ...options, backendURL }, defaults)
			).rejects.toThrow('upstream');
			expect(options.fetch).not.toHaveBeenCalled();
		}
	);

	test('does not rewrite an unchanged manifest but replaces a changed one', async () => {
		const options = optionsFor(await createRoot());
		const path = await writeManifestModule(options, defaults);
		// A rewrite must change this even on filesystems with coarse timestamps.
		const previousTime = new Date('2000-01-01T00:00:00.000Z');
		await utimes(path, previousTime, previousTime);
		const original = await stat(path);
		await writeManifestModule(options, defaults);
		expect((await stat(path)).mtimeMs).toBe(original.mtimeMs);
		options.fetch.mockResolvedValue(
			Response.json({
				...MANIFEST_FIXTURE,
				revision: 'new-revision',
			})
		);
		await writeManifestModule(options, defaults);
		expect(await readFile(path, 'utf8')).toContain('new-revision');
	});

	test.each([
		() => new Response('unavailable', { status: 503 }),
		() => new Response('invalid json', { status: 200 }),
	])(
		'rejects an unsuccessful or malformed response without writing a file',
		async (response) => {
			const root = await createRoot();
			const options = optionsFor(root);
			options.fetch.mockResolvedValue(response());
			await expect(writeManifestModule(options, defaults)).rejects.toThrow();
			await expect(stat(join(root, defaults.outputFile))).rejects.toMatchObject(
				{
					code: 'ENOENT',
				}
			);
		}
	);
});

describe('framework build snapshot', () => {
	test('keeps an explicit manifest URL intact, including its query', async () => {
		const options = optionsFor(await createRoot());
		const manifestURL = 'https://consent.example.com/public.json?version=2';
		await loadBuildManifest({ ...options, manifestURL }, 'test/build');
		expect(options.fetch).toHaveBeenCalledWith(manifestURL, expect.any(Object));
	});

	test('derives the upstream manifest URL from the backend', async () => {
		const options = optionsFor(await createRoot());
		expect(
			await loadBuildManifest(
				{
					backendURL: 'https://consent.example.com/api/',
					fetch: options.fetch,
				},
				'test/build'
			)
		).toEqual(MANIFEST_FIXTURE);
		expect(options.fetch).toHaveBeenCalledWith(
			'https://consent.example.com/api/manifest',
			expect.any(Object)
		);
	});

	test.each(['/api/c15t/manifest', 'file:///manifest.json', ''])(
		'rejects a source the build cannot fetch: %s',
		(manifestURL) => {
			expect(() => loadBuildManifest({ manifestURL }, 'test/build')).toThrow(
				'upstream'
			);
		}
	);

	test('shares one snapshot across Vite configuration resolution', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const plugin = consentManifest(options);
		await Promise.all([
			plugin.configResolved({ root }),
			plugin.configResolved({ root }),
		]);
		expect(options.fetch).toHaveBeenCalledTimes(1);
	});
});

describe('build snapshot validation', () => {
	const pack = createConsentManifestPolicyPack({
		id: 'regional',
		match: { countries: ['DE'] },
		model: 'opt-in',
		prompt: 'choice',
	});

	test.each([
		null,
		[],
		{},
		{ ...MANIFEST_FIXTURE, schemaVersion: 1 },
		{ ...MANIFEST_FIXTURE, revision: null },
		{ ...MANIFEST_FIXTURE, branding: 'unknown' },
		{ ...MANIFEST_FIXTURE, policyPacks: {} },
		{ ...MANIFEST_FIXTURE, policyPacks: [null] },
		{ ...MANIFEST_FIXTURE, policyPacks: [{ ...pack, fingerprints: {} }] },
		{
			...MANIFEST_FIXTURE,
			policyPacks: [{ ...pack, match: {} }],
		},
		{ ...MANIFEST_FIXTURE, translations: { customTranslations: { en: null } } },
		{
			...MANIFEST_FIXTURE,
			translations: { customTranslations: { en: { common: 'invalid' } } },
		},
		{
			...MANIFEST_FIXTURE,
			translations: {
				customTranslations: { en: { common: { acceptAll: {} } } },
			},
		},
		{
			...MANIFEST_FIXTURE,
			translations: { i18n: { messages: { default: { translations: [] } } } },
		},
		{ ...MANIFEST_FIXTURE, iab: { enabled: 'yes' } },
		{ ...MANIFEST_FIXTURE, vendors: [{ id: 'missing-fields' }] },
	])(
		'rejects invalid JSON data before loading or writing: %j',
		async (body) => {
			const options = optionsFor(await createRoot());
			options.fetch.mockImplementation(() =>
				Promise.resolve(Response.json(body))
			);
			await expect(loadBuildManifest(options, 'test/build')).rejects.toThrow(
				'test/build: /manifest returned an invalid consent manifest'
			);
			const defaults = {
				importSource: 'c15t/build',
				label: 'test/build',
				outputFile: 'generated/manifest.ts',
			};
			await expect(writeManifestModule(options, defaults)).rejects.toThrow(
				'invalid consent manifest'
			);
			await expect(
				stat(join(options.rootDir, defaults.outputFile))
			).rejects.toMatchObject({
				code: 'ENOENT',
			});
		}
	);

	test('accepts a regional manifest and preserves its translation copy', async () => {
		const body = {
			...MANIFEST_FIXTURE,
			policyPacks: [pack],
			translations: {
				i18n: {
					messages: {
						default: {
							translations: {
								de: { common: { acceptAll: 'Alle akzeptieren' } },
							},
						},
					},
				},
			},
		};
		const options = optionsFor(await createRoot());
		options.fetch.mockResolvedValue(Response.json(body));
		await expect(loadBuildManifest(options, 'test/build')).resolves.toEqual(
			body
		);
	});
});
