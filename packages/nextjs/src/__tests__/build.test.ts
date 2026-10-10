import {
	mkdir,
	mkdtemp,
	readFile,
	rm,
	stat,
	symlink,
	writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { withConsentManifest } from '../build';

const MANIFEST_FIXTURE = {
	branding: 'c15t',
	revision: 'build-test',
	schemaVersion: 2,
};

const CACHE = 'node_modules/.cache/c15t';

const directories: string[] = [];

/**
 * The TypeScript the examples install. Next.js 15 reads `tsconfig.json`
 * through its JavaScript API, which this package's TypeScript 7 lacks.
 */
const typescriptDir = dirname(
	createRequire(
		new URL('../../../../examples/nextjs/package.json', import.meta.url)
	).resolve('typescript/package.json')
);

/**
 * A temporary app root, which `withConsentManifest` reads from the cwd,
 * with TypeScript installed so a `c15t.config.ts` can be read.
 */
const createRoot = async () => {
	const root = await mkdtemp(join(tmpdir(), 'c15t-manifest-'));
	directories.push(root);
	await mkdir(join(root, 'node_modules'), { recursive: true });
	await symlink(typescriptDir, join(root, 'node_modules/typescript'), 'dir');
	vi.spyOn(process, 'cwd').mockReturnValue(root);
	return root;
};

const optionsFor = () => ({
	backendURL: 'https://consent.example.com',
	fetch: vi
		.fn<typeof globalThis.fetch>()
		.mockImplementation(() => Promise.resolve(Response.json(MANIFEST_FIXTURE))),
});

const readServerModule = (root: string) =>
	readFile(join(root, CACHE, 'manifest.js'), 'utf8');

afterEach(async () => {
	vi.restoreAllMocks();
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

describe('Next.js build-time manifest', () => {
	test.each(['phase-production-build', 'phase-development-server'])(
		'%s writes the snapshot under node_modules/.cache before returning the existing config',
		async (phase) => {
			const root = await createRoot();
			const options = optionsFor();
			const config = { basePath: '/app', reactStrictMode: true };
			const wrapped = withConsentManifest(config, options);
			expect(await wrapped(phase, { defaultConfig: {} })).toMatchObject(config);
			const source = await readServerModule(root);
			expect(source).toContain(
				'export const backendURL = "https://consent.example.com";'
			);
			expect(source).toContain(JSON.stringify(MANIFEST_FIXTURE.revision));
			const browser = await readFile(
				join(root, CACHE, 'manifest.browser.js'),
				'utf8'
			);
			expect(browser).toContain("import 'server-only';");
			expect(browser).not.toContain(MANIFEST_FIXTURE.revision);
			// Nothing lands in the app's source tree.
			await expect(stat(join(root, 'c15t-manifest.ts'))).rejects.toThrow();
			expect(options.fetch).toHaveBeenCalledTimes(1);
			expect(options.fetch).toHaveBeenCalledWith(
				'https://consent.example.com/manifest',
				expect.any(Object)
			);
		}
	);

	test('supports an async config factory and leaves production startup network-free', async () => {
		await createRoot();
		const options = optionsFor();
		const config = { basePath: '/app' };
		const factory = vi.fn(() => Promise.resolve(config));
		const context = { defaultConfig: {} };
		const wrapped = withConsentManifest(factory, options);
		expect(await wrapped('phase-production-server', context)).toBe(config);
		expect(factory).toHaveBeenCalledWith('phase-production-server', context);
		expect(options.fetch).not.toHaveBeenCalled();
	});

	test('aliases the snapshot for servers and the server-only module for browsers', async () => {
		const root = await createRoot();
		const userWebpack = vi.fn((config: { resolve?: object }) => ({
			...config,
			resolve: { alias: { existing: '/existing.js' } },
		}));
		const wrapped = withConsentManifest(
			{
				turbopack: { resolveAlias: { existing: './existing.js' } },
				webpack: userWebpack,
			},
			optionsFor()
		);
		const config = await wrapped('phase-production-build', {
			defaultConfig: {},
		});
		const server = join(root, CACHE, 'manifest.js');
		const browser = join(root, CACHE, 'manifest.browser.js');
		const specifiers = [
			'@c15t/nextjs/generated-manifest',
			'@c15t/core/generated',
			'c15t/generated',
		];

		const turbopackAlias = config.turbopack?.resolveAlias ?? {};
		expect(turbopackAlias.existing).toBe('./existing.js');
		for (const specifier of specifiers) {
			expect(turbopackAlias[specifier]).toEqual({
				browser: `./${CACHE}/manifest.browser.js`,
				default: `./${CACHE}/manifest.js`,
			});
		}

		const webpack = config.webpack as NonNullable<typeof config.webpack>;
		const aliasFor = (isServer: boolean) =>
			(
				webpack({}, { isServer } as never) as {
					resolve: { alias: Record<string, string> };
				}
			).resolve.alias;
		expect(aliasFor(true)).toEqual({
			...Object.fromEntries(specifiers.map((name) => [`${name}$`, server])),
			existing: '/existing.js',
		});
		expect(aliasFor(false)).toEqual({
			...Object.fromEntries(specifiers.map((name) => [`${name}$`, browser])),
			existing: '/existing.js',
		});
		expect(userWebpack).toHaveBeenCalledTimes(2);
	});

	test.each(['c15t.config.ts', 'c15t.config.mjs'])(
		'aliases %s into server and browser bundles',
		async (file) => {
			const root = await createRoot();
			await writeFile(join(root, file), 'export default {};\n');
			const config = await withConsentManifest({}, optionsFor())(
				'phase-development-server',
				{ defaultConfig: {} }
			);

			expect(config.turbopack?.resolveAlias?.['@c15t/nextjs/user-config']).toBe(
				`./${file}`
			);
			const webpack = config.webpack as NonNullable<typeof config.webpack>;
			for (const isServer of [true, false]) {
				const resolved = webpack({}, { isServer } as never) as {
					resolve: { alias: Record<string, string> };
				};
				expect(resolved.resolve.alias['@c15t/nextjs/user-config$']).toBe(
					join(root, file)
				);
			}
		}
	);

	test('leaves the config stub in place without a c15t.config file', async () => {
		await createRoot();
		const config = await withConsentManifest({}, optionsFor())(
			'phase-production-build',
			{ defaultConfig: {} }
		);

		expect(config.turbopack?.resolveAlias).not.toHaveProperty(
			'@c15t/nextjs/user-config'
		);
	});

	test('transpiles the c15t packages so Pages Router bundles see the alias', async () => {
		await createRoot();
		const config = await withConsentManifest(
			{
				serverExternalPackages: ['@c15t/core'],
				transpilePackages: ['ui-kit', 'c15t'],
			},
			optionsFor()
		)('phase-production-build', { defaultConfig: {} });
		// A package the app keeps external is not also transpiled, which
		// Next.js rejects.
		expect(config.transpilePackages).toEqual([
			'ui-kit',
			'c15t',
			'@c15t/nextjs',
		]);
	});

	test('next build stops when the fetch fails and leaves the earlier snapshot alone', async () => {
		const root = await createRoot();
		const options = optionsFor();
		const wrapped = withConsentManifest({}, options);
		await wrapped('phase-production-build', { defaultConfig: {} });
		const before = await readServerModule(root);
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		await expect(
			wrapped('phase-production-build', { defaultConfig: {} })
		).rejects.toThrow(
			"@c15t/nextjs/build: could not fetch the consent manifest from https://consent.example.com/manifest during the build (backend unavailable). Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to deploy with runtime fetching."
		);
		expect(await readServerModule(root)).toBe(before);
	});

	test('next dev warns and writes an undefined snapshot when the fetch fails', async () => {
		const root = await createRoot();
		const options = optionsFor();
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const config = { basePath: '/app' };
		const wrapped = withConsentManifest(config, options);
		expect(
			await wrapped('phase-development-server', { defaultConfig: {} })
		).toMatchObject(config);
		expect(await readServerModule(root)).toContain(
			'export const snapshot = undefined;'
		);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'@c15t/nextjs/build: could not fetch the consent manifest from https://consent.example.com/manifest during dev (backend unavailable)'
			)
		);
	});

	test.each([
		['onBuildError', { onBuildError: 'runtime' as const }, {}],
		['C15T_ON_BUILD_ERROR', {}, { C15T_ON_BUILD_ERROR: 'runtime' }],
	])('%s runtime lets next build continue', async (_name, setting, env) => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const root = await createRoot();
		const options = { ...optionsFor(), ...setting };
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		await withConsentManifest({}, options)('phase-production-build', {
			defaultConfig: {},
		});
		expect(warn).toHaveBeenCalledTimes(1);
		expect(await readServerModule(root)).toContain(
			'export const snapshot = undefined;'
		);
	});

	test('reads NEXT_PUBLIC_C15T_BACKEND_URL when backendURL is left out', async () => {
		vi.stubEnv('NEXT_PUBLIC_C15T_BACKEND_URL', 'https://env.example.com/api');
		const root = await createRoot();
		const { fetch } = optionsFor();
		await withConsentManifest({}, { fetch })('phase-production-build', {
			defaultConfig: {},
		});
		expect(fetch).toHaveBeenCalledWith(
			'https://env.example.com/api/manifest',
			expect.any(Object)
		);
		expect(await readServerModule(root)).toContain(
			'export const backendURL = "https://env.example.com/api";'
		);
	});

	test.each([
		['hosted()', "{ mode: { type: 'hosted' } }", 'uses hosted()'],
		['offline()', "{ mode: { type: 'offline' } }", 'uses offline()'],
		[
			'manifest({ snapshot })',
			"{ mode: { type: 'manifest', snapshot: { revision: 'own' } } }",
			'manifest({ snapshot })',
		],
		[
			"manifest({ source: 'runtime' })",
			"{ mode: { type: 'manifest', source: 'runtime' } }",
			"manifest({ source: 'runtime' })",
		],
	])(
		'next build skips the fetch when c15t.config.ts uses %s',
		async (_mode, exported, reason) => {
			const root = await createRoot();
			await writeFile(
				join(root, 'c15t.config.ts'),
				`const config: Record<string, unknown> = ${exported};\nexport default config;\n`
			);
			const options = optionsFor();
			// An unreachable backend must not matter: nothing is fetched.
			options.fetch.mockRejectedValue(new Error('backend unavailable'));
			const info = vi
				.spyOn(console, 'info')
				.mockImplementation(() => undefined);
			const config = await withConsentManifest({}, options)(
				'phase-production-build',
				{ defaultConfig: {} }
			);
			expect(options.fetch).not.toHaveBeenCalled();
			expect(await readServerModule(root)).toContain(
				'export const snapshot = undefined;'
			);
			expect(info).toHaveBeenCalledWith(expect.stringContaining(reason));
			// The config is still aliased into the bundles.
			expect(config.turbopack?.resolveAlias?.['@c15t/nextjs/user-config']).toBe(
				'./c15t.config.ts'
			);
		}
	);

	test('next build still fetches for manifest() in c15t.config.mjs', async () => {
		const root = await createRoot();
		await writeFile(
			join(root, 'c15t.config.mjs'),
			"export default { mode: { type: 'manifest' } };\n"
		);
		const options = optionsFor();
		await withConsentManifest({}, options)('phase-production-build', {
			defaultConfig: {},
		});
		expect(options.fetch).toHaveBeenCalledTimes(1);
		expect(await readServerModule(root)).toContain(
			JSON.stringify(MANIFEST_FIXTURE.revision)
		);
	});

	test("fetches from the config's backendURL when the env leaves it out", async () => {
		const root = await createRoot();
		await writeFile(
			join(root, 'c15t.config.ts'),
			"export default { backendURL: 'https://config.example.com' };\n"
		);
		const { fetch } = optionsFor();
		await withConsentManifest({}, { fetch })('phase-production-build', {
			defaultConfig: {},
		});
		expect(fetch).toHaveBeenCalledWith(
			'https://config.example.com/manifest',
			expect.any(Object)
		);
		expect(await readServerModule(root)).toContain(
			'export const backendURL = "https://config.example.com";'
		);
	});

	test('warns and fetches as for manifest() when c15t.config.ts cannot be read', async () => {
		const root = await createRoot();
		await writeFile(
			join(root, 'c15t.config.ts'),
			"throw new Error('config exploded');\n"
		);
		const options = optionsFor();
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		await withConsentManifest({}, options)('phase-production-build', {
			defaultConfig: {},
		});
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'@c15t/nextjs/build: could not read c15t.config.ts'
			)
		);
		expect(String(warn.mock.calls[0]?.[0])).toContain('config exploded');
		expect(options.fetch).toHaveBeenCalledTimes(1);
	});

	test.each(['runtime', 'fail'] as const)(
		"skips the fetch for output: 'export' with onBuildError: %s",
		async (onBuildError) => {
			const root = await createRoot();
			const options = { ...optionsFor(), onBuildError };
			const info = vi
				.spyOn(console, 'info')
				.mockImplementation(() => undefined);
			const wrapped = withConsentManifest({ output: 'export' }, options);
			await wrapped('phase-production-build', { defaultConfig: {} });
			expect(options.fetch).not.toHaveBeenCalled();
			expect(await readServerModule(root)).toContain(
				'export const snapshot = undefined;'
			);
			expect(info).toHaveBeenCalledWith(
				expect.stringContaining("`output: 'export'`")
			);
		}
	);
});
