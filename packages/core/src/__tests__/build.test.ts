import { readFileSync } from 'node:fs';
import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	stat,
	utimes,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { createConsentManifestPolicyPack } from '@c15t/schema/types';
import { build, resolveConfig } from 'vite';
import type { Rollup } from 'vite';
import { afterEach, describe, expect, test, vi } from 'vitest';

import {
	consentManifest,
	createConsentManifestPlugin,
	GENERATED_MODULE_IDS,
	loadBuildManifest,
	MANIFEST_CACHE_DIR,
	writeManifestCacheModule,
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

const createLogger = () => ({ info: vi.fn(), warn: vi.fn() });

afterEach(async () => {
	vi.unstubAllEnvs();
	await Promise.all(
		directories.splice(0).map((path) =>
			rm(path, {
				force: true,
				recursive: true,
			})
		)
	);
});

/** Builds `source` as the app entry with the plugin and returns the code. */
const buildEntry = async (
	root: string,
	plugin: ReturnType<typeof consentManifest>,
	source: string,
	options: { ssr?: boolean } = {}
): Promise<string> => {
	await mkdir(join(root, 'src'), { recursive: true });
	const entry = join(root, 'src/entry.js');
	await writeFile(entry, source);
	const output = (await build({
		build: {
			minify: false,
			rollupOptions: { input: entry, preserveEntrySignatures: 'strict' },
			ssr: options.ssr,
			write: false,
		},
		configFile: false,
		logLevel: 'silent',
		plugins: [plugin],
		root,
	})) as Rollup.RollupOutput | Rollup.RollupOutput[];
	const [first] = Array.isArray(output) ? output : [output];
	return (first?.output ?? [])
		.map((chunk) => (chunk.type === 'chunk' ? chunk.code : ''))
		.join('\n');
};

const GENERATED_ENTRY =
	"export { backendURL, snapshot } from '@c15t/core/generated';\nexport { snapshot as umbrella } from 'c15t/generated';\n";

describe('@c15t/core/generated in Vite', () => {
	test('a single-page app build bundles the snapshot and writes no file', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const code = await buildEntry(
			root,
			consentManifest(options),
			GENERATED_ENTRY
		);
		expect(code).toContain('build-test');
		expect(code).toContain('https://consent.example.com');
		expect(options.fetch).toHaveBeenCalledTimes(1);
		await expect(stat(join(root, 'src/c15t-manifest.ts'))).rejects.toThrow();
	});

	test('a server-rendered framework keeps the snapshot out of the client build', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const plugin = () =>
			createConsentManifestPlugin(options, {
				envNames: ['VITE_C15T_BACKEND_URL'],
				label: 'test/build',
				serverRendered: true,
			});
		const client = await buildEntry(root, plugin(), GENERATED_ENTRY);
		expect(client).not.toContain('build-test');
		// The backend URL is public, so the browser still gets it.
		expect(client).toContain('https://consent.example.com');
		const server = await buildEntry(root, plugin(), GENERATED_ENTRY, {
			ssr: true,
		});
		expect(server).toContain('build-test');
	});

	test.each([
		['client', true, false],
		['server', true, true],
		['client', false, true],
	] as const)(
		'the %s environment of a server-rendered (%s) app gets the snapshot: %s',
		async (consumer, serverRendered, included) => {
			const root = await createRoot();
			const plugin = createConsentManifestPlugin(optionsFor(root), {
				envNames: [],
				label: 'test/build',
				serverRendered,
			});
			await plugin.configResolved({ root });
			const id = plugin.resolveId(GENERATED_MODULE_IDS[0]);
			expect(id).toBeDefined();
			expect(plugin.resolveId('c15t/generated')).toBe(id);
			const source = await plugin.load.call(
				{ environment: { config: { consumer } } },
				id as string
			);
			expect(source?.includes('build-test')).toBe(included);
			expect(source).toContain(
				'export const backendURL = "https://consent.example.com";'
			);
		}
	);

	test('reads the ssr flag where Vite has no environments', async () => {
		const root = await createRoot();
		const plugin = createConsentManifestPlugin(optionsFor(root), {
			envNames: [],
			label: 'test/build',
			serverRendered: true,
		});
		await plugin.configResolved({ root });
		const id = plugin.resolveId(GENERATED_MODULE_IDS[0]) as string;
		expect(await plugin.load.call(undefined, id, { ssr: true })).toContain(
			'build-test'
		);
		expect(await plugin.load.call(undefined, id)).not.toContain('build-test');
	});

	test('a framework can decide from the resolved config', async () => {
		const root = await createRoot();
		const plugin = createConsentManifestPlugin(optionsFor(root), {
			envNames: [],
			label: 'test/build',
			serverRendered: (config) =>
				config.plugins?.some((entry) => entry.name === 'framework') ?? false,
		});
		await plugin.configResolved({ plugins: [{ name: 'framework' }], root });
		const id = plugin.resolveId(GENERATED_MODULE_IDS[0]) as string;
		expect(
			await plugin.load.call(
				{ environment: { config: { consumer: 'client' } } },
				id
			)
		).not.toContain('build-test');
	});

	test('keeps the module out of pre-bundling and bundles c15t packages on the server', () => {
		const { optimizeDeps, ssr } = consentManifest().config();
		expect(optimizeDeps.exclude).toEqual([...GENERATED_MODULE_IDS]);
		expect(ssr.noExternal).toEqual(
			expect.arrayContaining(['c15t', '@c15t/core', '@c15t/react'])
		);
	});

	test('leaves other modules alone', async () => {
		const plugin = consentManifest();
		expect(plugin.resolveId('@c15t/core')).toBeUndefined();
		expect(await plugin.load.call(undefined, '/src/app.ts')).toBeUndefined();
	});

	test('preview does not fetch the manifest', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
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
	});

	test('dev serves an undefined snapshot when the fetch fails', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		const logger = createLogger();
		const plugin = consentManifest(options);
		await plugin.configResolved({ command: 'serve', logger, root });
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/^@c15t\/core\/build: could not fetch .* during dev/u
			)
		);
		const source = await plugin.load.call(
			undefined,
			plugin.resolveId(GENERATED_MODULE_IDS[0]) as string
		);
		expect(source).toContain('export const snapshot = undefined;');
		await expect(
			consentManifest(options).configResolved({ command: 'build', root })
		).rejects.toThrow('during the build (backend unavailable)');
	});

	test('reads VITE_C15T_BACKEND_URL from .env and exposes it', async () => {
		const root = await createRoot();
		await writeFile(
			join(root, '.env.production'),
			'VITE_C15T_BACKEND_URL="https://env.example.com/api"\n'
		);
		const { fetch } = optionsFor(root);
		const env: Record<string, unknown> = {};
		const plugin = consentManifest({ fetch });
		await plugin.configResolved({
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
		expect(
			await plugin.load.call(
				undefined,
				plugin.resolveId(GENERATED_MODULE_IDS[0]) as string
			)
		).toContain('export const backendURL = "https://env.example.com/api";');
	});

	test('suggests hosted() when the policy depends on location', async () => {
		const root = await createRoot();
		const regional = {
			...MANIFEST_FIXTURE,
			policyPacks: [
				createConsentManifestPolicyPack({
					id: 'regional',
					match: { countries: ['DE'] },
					model: 'opt-in',
					prompt: 'choice',
				}),
			],
		};
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(() => Promise.resolve(Response.json(regional)));
		const logger = createLogger();
		await consentManifest({
			backendURL: 'https://consent.example.com',
			fetch,
		}).configResolved({ command: 'build', logger, root });
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/^@c15t\/core\/build: the consent policy depends on the visitor's location.*hosted\(\)/u
			)
		);

		const everywhere = createLogger();
		await consentManifest(optionsFor(root)).configResolved({
			command: 'build',
			logger: everywhere,
			root,
		});
		expect(everywhere.warn).not.toHaveBeenCalled();
	});

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

	test('retries a failed fetch and shares the recovered snapshot', async () => {
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
		await Promise.all([
			plugin.configResolved({ root }),
			plugin.configResolved({ root }),
		]);
		await plugin.configResolved({ root });
		expect(options.fetch).toHaveBeenCalledTimes(2);
		expect(
			await plugin.load.call(
				undefined,
				plugin.resolveId(GENERATED_MODULE_IDS[0]) as string
			)
		).toContain('build-test');
	});
});

describe('@c15t/core/generated typings', () => {
	const packageRoot = resolve(__dirname, '../..');
	const readJSON = (path: string) =>
		JSON.parse(readFileSync(path, 'utf8')) as {
			exports: Record<string, { types: string }>;
		};

	test('the package exports declarations, so type checks pass before any build', () => {
		const { exports } = readJSON(join(packageRoot, 'package.json'));
		expect(exports['./generated']?.types).toBe('./dist-types/generated.d.ts');
		const declarations = readFileSync(
			join(packageRoot, 'dist-types/generated.d.ts'),
			'utf8'
		);
		expect(declarations).toContain(
			'export declare const backendURL: string | undefined;'
		);
		expect(declarations).toContain(
			'export declare const snapshot: ConsentManifest | undefined;'
		);
	});

	test('c15t/generated re-exports them', () => {
		const umbrella = resolve(packageRoot, '../c15t');
		const { exports } = readJSON(join(umbrella, 'package.json'));
		const types = exports['./generated']?.types;
		expect(types).toBeDefined();
		expect(readFileSync(join(umbrella, types as string), 'utf8')).toContain(
			"export * from '@c15t/core/generated';"
		);
	});

	test('the stand-in module exports undefined without a build integration', async () => {
		expect({ ...(await import('../generated')) }).toEqual({
			backendURL: undefined,
			snapshot: undefined,
		});
	});
});

describe('node_modules/.cache/c15t output', () => {
	const defaultsFor = (rootDir: string) => ({
		command: 'build' as const,
		envNames: ['NEXT_PUBLIC_C15T_BACKEND_URL'],
		importSource: 'c15t/next/static',
		label: 'test/build',
		rootDir,
	});

	test('writes the snapshot for servers and a server-only stand-in for browsers', async () => {
		const root = await createRoot();
		const files = await writeManifestCacheModule(
			optionsFor(root),
			defaultsFor(root),
			createLogger()
		);
		const directory = join(root, MANIFEST_CACHE_DIR);
		expect(files).toEqual({
			browser: join(directory, 'manifest.browser.js'),
			server: join(directory, 'manifest.js'),
		});
		const server = await readFile(files.server, 'utf8');
		expect(server).toContain('"revision": "build-test"');
		expect(server).toContain(
			'export const backendURL = "https://consent.example.com";'
		);
		expect(server).not.toContain('server-only');
		const browser = await readFile(files.browser, 'utf8');
		expect(browser).toContain("import 'server-only';");
		expect(browser).toContain('export const snapshot = undefined;');
		expect(browser).not.toContain('build-test');
		expect(await readFile(join(directory, 'manifest.d.ts'), 'utf8')).toBe(
			[
				"import type { ConsentManifest } from 'c15t/next/static';",
				'',
				'export declare const backendURL: string | undefined;',
				'export declare const snapshot: ConsentManifest | undefined;',
				'',
			].join('\n')
		);
	});

	test('the server module is valid JavaScript with the fetched values', async () => {
		const root = await createRoot();
		const { server } = await writeManifestCacheModule(
			optionsFor(root),
			defaultsFor(root),
			createLogger()
		);
		expect({ ...(await import(server)) }).toEqual({
			backendURL: 'https://consent.example.com',
			snapshot: MANIFEST_FIXTURE,
		});
	});

	test('does not rewrite an unchanged snapshot but replaces a changed one', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const { server } = await writeManifestCacheModule(
			options,
			defaultsFor(root),
			createLogger()
		);
		// A rewrite must change this even on filesystems with coarse timestamps.
		const previousTime = new Date('2000-01-01T00:00:00.000Z');
		await utimes(server, previousTime, previousTime);
		const original = await stat(server);
		await writeManifestCacheModule(options, defaultsFor(root), createLogger());
		expect((await stat(server)).mtimeMs).toBe(original.mtimeMs);
		options.fetch.mockResolvedValue(
			Response.json({ ...MANIFEST_FIXTURE, revision: 'new-revision' })
		);
		await writeManifestCacheModule(options, defaultsFor(root), createLogger());
		expect(await readFile(server, 'utf8')).toContain('new-revision');
	});

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
			const root = await createRoot();
			const options = optionsFor(root);
			await writeManifestCacheModule(
				{ ...options, backendURL },
				defaultsFor(root),
				createLogger()
			);
			expect(options.fetch).toHaveBeenCalledWith(
				manifestURL,
				expect.any(Object)
			);
		}
	);
});

describe('build-time manifest policy', () => {
	const STUB = 'export const snapshot = undefined;';
	const defaultsFor = (rootDir: string, command: 'build' | 'dev') => ({
		command,
		envNames: ['VITE_C15T_BACKEND_URL'],
		importSource: 'c15t/build',
		label: 'test/build',
		rootDir,
	});
	const write = async (
		overrides: Record<string, unknown> = {},
		command: 'build' | 'dev' = 'build',
		extra: { skipReason?: string } = {}
	) => {
		const root = await createRoot();
		const options = { ...optionsFor(root), ...overrides };
		const logger = createLogger();
		const result = await writeManifestCacheModule(
			options,
			{ ...defaultsFor(root, command), ...extra },
			logger
		).then(
			async (files) => ({
				error: undefined,
				source: await readFile(files.server, 'utf8'),
			}),
			(error: unknown) => ({ error: error as Error, source: undefined })
		);
		return { ...result, logger, options, root };
	};
	const refused = () =>
		new TypeError('fetch failed', {
			cause: Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:9'), {
				code: 'ECONNREFUSED',
			}),
		});

	test('stops a production build by default and leaves no file', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(refused());
		const { error, root } = await write({ fetch });
		expect(error?.message).toBe(
			"test/build: could not fetch the consent manifest from https://consent.example.com/manifest during the build (fetch failed: connect ECONNREFUSED 127.0.0.1:9). Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to deploy with runtime fetching."
		);
		await expect(
			stat(join(root, MANIFEST_CACHE_DIR, 'manifest.js'))
		).rejects.toMatchObject({ code: 'ENOENT' });
	});

	test('warns in dev by default and writes an undefined snapshot', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(refused());
		const { logger, source } = await write({ fetch }, 'dev');
		expect(source).toContain(STUB);
		expect(logger.warn).toHaveBeenCalledWith(
			'could not fetch the consent manifest from https://consent.example.com/manifest during dev (fetch failed: connect ECONNREFUSED 127.0.0.1:9). The server fetches it at runtime instead. A production build stops on this error.'
		);
	});

	test("onBuildError: 'runtime' falls back in a production build", async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValue(new Response(null, { status: 503 }));
		const { logger, source } = await write({ fetch, onBuildError: 'runtime' });
		expect(source).toContain(STUB);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('(/manifest responded 503')
		);
	});

	test("onBuildError: 'fail' stops dev", async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new Error('backend unavailable'));
		const { error } = await write({ fetch, onBuildError: 'fail' }, 'dev');
		expect(error?.message).toContain('during dev (backend unavailable)');
	});

	test("C15T_ON_BUILD_ERROR=runtime overrides onBuildError: 'fail'", async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', 'runtime');
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new Error('backend unavailable'));
		const { source } = await write({ fetch, onBuildError: 'fail' });
		expect(source).toContain(STUB);
	});

	test("C15T_ON_BUILD_ERROR=fail overrides onBuildError: 'runtime'", async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', 'fail');
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new Error('backend unavailable'));
		const { error } = await write({ fetch, onBuildError: 'runtime' }, 'dev');
		expect(error?.message).toContain('backend unavailable');
	});

	test('rejects an unknown C15T_ON_BUILD_ERROR or onBuildError', async () => {
		vi.stubEnv('C15T_ON_BUILD_ERROR', 'warn');
		const fromEnv = await write();
		expect(fromEnv.error?.message).toContain(
			"C15T_ON_BUILD_ERROR must be 'runtime' or 'fail'"
		);
		expect(fromEnv.options.fetch).not.toHaveBeenCalled();
		vi.unstubAllEnvs();
		const fromOption = await write({ onBuildError: 'warn' });
		expect(fromOption.error?.message).toContain(
			"onBuildError must be 'runtime' or 'fail'"
		);
	});

	test.each(['/api/c15t', 'file:///backend'])(
		'skips the fetch in a production build for backendURL %j',
		async (backendURL) => {
			const { logger, options, source } = await write({ backendURL });
			expect(options.fetch).not.toHaveBeenCalled();
			expect(source).toContain(STUB);
			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('not an absolute http(s) URL')
			);
		}
	);

	test.each([undefined, ''])(
		'a production build fails without a backend URL (%j)',
		async (backendURL) => {
			const { error, options } = await write({ backendURL });
			expect(error?.message).toBe(
				"test/build: no backend URL is set, so the build cannot fetch the consent manifest. Pass backendURL or set VITE_C15T_BACKEND_URL. Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to build without a snapshot."
			);
			expect(options.fetch).not.toHaveBeenCalled();
		}
	);

	test('dev warns without a backend URL', async () => {
		const { logger, source } = await write({ backendURL: undefined }, 'dev');
		expect(source).toContain(STUB);
		expect(logger.warn).toHaveBeenCalledWith(
			'no backend URL is set, so dev cannot fetch the consent manifest. Pass backendURL or set VITE_C15T_BACKEND_URL. A production build stops on this error.'
		);
	});

	test("onBuildError: 'runtime' skips a build without a backend URL with a notice", async () => {
		const { logger, source } = await write({
			backendURL: undefined,
			onBuildError: 'runtime',
		});
		expect(source).toContain(STUB);
		expect(logger.warn).not.toHaveBeenCalled();
		expect(logger.info).toHaveBeenCalledWith(
			'skipped the consent manifest fetch because no backend URL is set. Pass backendURL or set VITE_C15T_BACKEND_URL.'
		);
	});

	test("rejects a relative backendURL with onBuildError: 'fail'", async () => {
		const { error, options } = await write({
			backendURL: '/api/c15t',
			onBuildError: 'fail',
		});
		expect(error?.message).toContain(
			'build-time manifests require an absolute upstream URL. Pass backendURL or set VITE_C15T_BACKEND_URL.'
		);
		expect(options.fetch).not.toHaveBeenCalled();
	});

	test.each(['runtime', 'fail'] as const)(
		'a framework skip reason skips the fetch with onBuildError: %s',
		async (onBuildError) => {
			const { logger, options, source } = await write(
				{ onBuildError },
				'build',
				{ skipReason: 'the app has no server' }
			);
			expect(options.fetch).not.toHaveBeenCalled();
			expect(source).toContain(STUB);
			expect(logger.info).toHaveBeenCalledWith(
				'skipped the consent manifest fetch because the app has no server.'
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
			await expect(
				writeManifestCacheModule(
					options,
					{
						command: 'build',
						importSource: 'c15t/build',
						label: 'test/build',
						rootDir: options.rootDir,
					},
					createLogger()
				)
			).rejects.toThrow('invalid consent manifest');
			await expect(
				stat(join(options.rootDir, MANIFEST_CACHE_DIR, 'manifest.js'))
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
			const { server } = await writeManifestCacheModule(
				options,
				{
					command: 'build',
					importSource: 'c15t/build',
					label: 'test/build',
					rootDir: options.rootDir,
				},
				createLogger()
			);
			expect(await readFile(server, 'utf8')).toContain(
				`"hosting": "${hosting}"`
			);
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
