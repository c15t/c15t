import {
	mkdtemp,
	readFile,
	rm,
	stat,
	utimes,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { build, resolveConfig } from 'vite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	consentManifest,
	loadBuildManifest,
	writeManifestModule,
	writeManifestModuleWithFallback,
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
	test('preview uses the built snapshot while the backend is unavailable', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const file = await writeManifestModule(options, {
			importSource: 'c15t/build',
			label: 'test/build',
			outputFile: 'src/c15t-manifest.ts',
		});
		const source = await readFile(file, 'utf8');
		const previousTime = new Date('2000-01-01T00:00:00.000Z');
		await utimes(file, previousTime, previousTime);
		const original = await stat(file);
		options.fetch.mockClear();
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		await resolveConfig(
			{
				configFile: false,
				logLevel: 'silent',
				plugins: [consentManifest(options)],
				root,
			},
			'serve',
			'production',
			'production',
			true
		);
		expect(options.fetch).not.toHaveBeenCalled();
		expect(await readFile(file, 'utf8')).toBe(source);
		expect((await stat(file)).mtimeMs).toBe(original.mtimeMs);
	});

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

describe('build-time manifest policy', () => {
	const defaults = {
		command: 'build' as const,
		envNames: ['VITE_C15T_BACKEND_URL'],
		importSource: 'c15t/build',
		label: 'test/build',
		outputFile: 'generated/manifest.ts',
	};
	const dev = { ...defaults, command: 'dev' as const };
	const createLogger = () => ({ info: vi.fn(), warn: vi.fn() });
	const STUB =
		'export const consentManifest: ConsentManifest | undefined = undefined;';
	const refused = () =>
		new TypeError('fetch failed', {
			cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9'), {
				code: 'ECONNREFUSED',
			}),
		});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	test('writes the snapshot when the fetch succeeds', async () => {
		const options = optionsFor(await createRoot());
		const logger = createLogger();
		const file = await writeManifestModuleWithFallback(
			options,
			defaults,
			logger
		);
		expect(await readFile(file, 'utf8')).toContain('build-test');
		expect(logger.warn).not.toHaveBeenCalled();
	});

	test('stops a production build by default and leaves the file alone', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		options.fetch.mockRejectedValue(refused());
		const error = await writeManifestModuleWithFallback(
			options,
			defaults,
			createLogger()
		).catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe(
			"test/build: could not fetch the consent manifest from https://consent.example.com/manifest during the build (fetch failed: connect ECONNREFUSED 127.0.0.1:9). Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to deploy with runtime fetching."
		);
		await expect(stat(join(root, defaults.outputFile))).rejects.toMatchObject({
			code: 'ENOENT',
		});
	});

	test('warns in dev by default and writes an undefined export', async () => {
		const options = optionsFor(await createRoot());
		options.fetch.mockRejectedValue(refused());
		const logger = createLogger();
		const file = await writeManifestModuleWithFallback(options, dev, logger);
		const source = await readFile(file, 'utf8');
		expect(source).toContain(
			"import type { ConsentManifest } from 'c15t/build';"
		);
		expect(source).toContain(STUB);
		expect(logger.warn).toHaveBeenCalledWith(
			'could not fetch the consent manifest from https://consent.example.com/manifest during dev (fetch failed: connect ECONNREFUSED 127.0.0.1:9). The server fetches it at runtime instead. A production build stops on this error.'
		);
	});

	test("onBuildError: 'runtime' falls back in a production build", async () => {
		const options = optionsFor(await createRoot());
		const file = await writeManifestModuleWithFallback(
			options,
			defaults,
			createLogger()
		);
		options.fetch.mockResolvedValue(new Response(null, { status: 503 }));
		const logger = createLogger();
		await writeManifestModuleWithFallback(
			{ ...options, onBuildError: 'runtime' },
			defaults,
			logger
		);
		// The earlier snapshot is replaced, never reused.
		expect(await readFile(file, 'utf8')).toContain(STUB);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('(/manifest responded 503')
		);
	});

	test("onBuildError: 'fail' stops dev", async () => {
		const options = optionsFor(await createRoot());
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		await expect(
			writeManifestModuleWithFallback(
				{ ...options, onBuildError: 'fail' },
				dev,
				createLogger()
			)
		).rejects.toThrow('during dev (backend unavailable)');
	});

	test("C15T_ON_BUILD_ERROR=runtime overrides onBuildError: 'fail'", async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', 'runtime');
		const options = optionsFor(await createRoot());
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		const file = await writeManifestModuleWithFallback(
			{ ...options, onBuildError: 'fail' },
			defaults,
			createLogger()
		);
		expect(await readFile(file, 'utf8')).toContain(STUB);
	});

	test("C15T_ON_BUILD_ERROR=fail overrides onBuildError: 'runtime'", async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', 'fail');
		const options = optionsFor(await createRoot());
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		await expect(
			writeManifestModuleWithFallback(
				{ ...options, onBuildError: 'runtime' },
				dev,
				createLogger()
			)
		).rejects.toThrow('backend unavailable');
	});

	test('rejects an unknown C15T_ON_BUILD_ERROR', async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', 'warn');
		const options = optionsFor(await createRoot());
		await expect(
			writeManifestModuleWithFallback(options, defaults, createLogger())
		).rejects.toThrow("C15T_ON_BUILD_ERROR must be 'runtime' or 'fail'");
		expect(options.fetch).not.toHaveBeenCalled();
	});

	test.each([
		['/api/c15t', 'not an absolute http(s) URL'],
		['file:///backend', 'not an absolute http(s) URL'],
		[
			undefined,
			'no backend URL is set. Pass backendURL or set VITE_C15T_BACKEND_URL.',
		],
	])(
		'skips the fetch in a production build for backendURL %j',
		async (backendURL, notice) => {
			const options = optionsFor(await createRoot());
			const logger = createLogger();
			const file = await writeManifestModuleWithFallback(
				{ ...options, backendURL },
				defaults,
				logger
			);
			expect(options.fetch).not.toHaveBeenCalled();
			expect(await readFile(file, 'utf8')).toContain(STUB);
			expect(logger.info).toHaveBeenCalledWith(expect.stringContaining(notice));
		}
	);

	test("rejects a relative backendURL with onBuildError: 'fail'", async () => {
		const options = optionsFor(await createRoot());
		await expect(
			writeManifestModuleWithFallback(
				{ ...options, backendURL: '/api/c15t', onBuildError: 'fail' },
				defaults,
				createLogger()
			)
		).rejects.toThrow(
			'build-time manifests require an absolute upstream URL. Pass backendURL or set VITE_C15T_BACKEND_URL.'
		);
		expect(options.fetch).not.toHaveBeenCalled();
	});

	test.each(['runtime', 'fail'] as const)(
		'a framework skip reason skips the fetch with onBuildError: %s',
		async (onBuildError) => {
			const options = optionsFor(await createRoot());
			const logger = createLogger();
			const file = await writeManifestModuleWithFallback(
				{ ...options, onBuildError },
				{ ...defaults, skipReason: 'the app has no server' },
				logger
			);
			expect(options.fetch).not.toHaveBeenCalled();
			expect(await readFile(file, 'utf8')).toContain(STUB);
			expect(logger.info).toHaveBeenCalledWith(
				'skipped the consent manifest fetch because the app has no server.'
			);
		}
	);

	test('still rejects an invalid onBuildError or export name', async () => {
		const options = optionsFor(await createRoot());
		await expect(
			writeManifestModuleWithFallback(
				// @ts-expect-error -- checks the runtime guard for JavaScript callers.
				{ ...options, onBuildError: 'warn' },
				defaults,
				createLogger()
			)
		).rejects.toThrow("onBuildError must be 'runtime' or 'fail'");
		await expect(
			writeManifestModuleWithFallback(
				{ ...options, exportName: 'default' },
				dev,
				createLogger()
			)
		).rejects.toThrow('exportName must be a valid identifier');
	});

	test('the Vite plugin reads VITE_C15T_BACKEND_URL from .env and exposes it', async () => {
		const root = await createRoot();
		await writeFile(
			join(root, '.env.production'),
			'VITE_C15T_BACKEND_URL="https://env.example.com/api"\n'
		);
		const { fetch } = optionsFor(root);
		const env: Record<string, unknown> = {};
		await consentManifest({ fetch }).configResolved({
			command: 'build',
			env,
			mode: 'production',
			root,
		});
		expect(fetch).toHaveBeenCalledWith(
			'https://env.example.com/api/manifest',
			expect.any(Object)
		);
		expect(env.VITE_C15T_BACKEND_URL).toBe('https://env.example.com/api');
	});

	test('the Vite plugin warns in vite dev and fails in vite build', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		const logger = createLogger();
		await consentManifest(options).configResolved({
			command: 'serve',
			logger,
			root,
		});
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/^@c15t\/core\/build: could not fetch .* during dev/u
			)
		);
		await expect(
			consentManifest(options).configResolved({ command: 'build', root })
		).rejects.toThrow('during the build (backend unavailable)');
	});
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

	test('retries a failed generation and shares the recovered snapshot', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		options.fetch.mockResolvedValueOnce(
			new Response('unavailable', { status: 503 })
		);
		const plugin = consentManifest(options);
		const results = await Promise.allSettled([
			plugin.configResolved({ root }),
			plugin.configResolved({ root }),
		]);
		expect(results.map((result) => result.status)).toEqual([
			'rejected',
			'rejected',
		]);
		expect(options.fetch).toHaveBeenCalledTimes(1);
		await expect(
			stat(join(root, 'src/c15t-manifest.ts'))
		).rejects.toMatchObject({
			code: 'ENOENT',
		});
		await Promise.all([
			plugin.configResolved({ root }),
			plugin.configResolved({ root }),
		]);
		expect(
			await readFile(join(root, 'src/c15t-manifest.ts'), 'utf8')
		).toContain('build-test');
		await plugin.configResolved({ root });
		expect(options.fetch).toHaveBeenCalledTimes(2);
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
		{ ...MANIFEST_FIXTURE, hosting: 'unknown' },
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

	test.each(['inth', 'self-hosted'])(
		'preserves backend hosting %s in generated snapshots',
		async (hosting) => {
			const body = { ...MANIFEST_FIXTURE, hosting };
			const options = optionsFor(await createRoot());
			options.fetch.mockImplementation(() =>
				Promise.resolve(Response.json(body))
			);
			await expect(loadBuildManifest(options, 'test/build')).resolves.toEqual(
				body
			);
			const file = await writeManifestModule(options, {
				importSource: 'c15t/build',
				label: 'test/build',
				outputFile: 'generated/manifest.ts',
			});
			expect(await readFile(file, 'utf8')).toContain(`"hosting": "${hosting}"`);
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
