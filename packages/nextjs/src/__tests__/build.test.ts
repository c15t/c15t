import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { withConsentManifest } from '../build';

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

describe('Next.js build-time manifest', () => {
	test.each(['phase-production-build', 'phase-development-server'])(
		'%s writes the snapshot before returning the existing config',
		async (phase) => {
			const root = await createRoot();
			const options = optionsFor(root);
			const config = { basePath: '/app', reactStrictMode: true };
			const wrapped = withConsentManifest(config, options);
			expect(await wrapped(phase, { defaultConfig: {} })).toMatchObject(config);
			const source = await readFile(join(root, 'c15t-manifest.ts'), 'utf8');
			expect(source).toContain("from 'c15t/next/static'");
			expect(source).toContain('export const consentManifest =');
			expect(source).toContain(JSON.stringify(MANIFEST_FIXTURE.revision));
			expect(options.fetch).toHaveBeenCalledTimes(1);
			expect(options.fetch).toHaveBeenCalledWith(
				'https://consent.example.com/manifest',
				expect.any(Object)
			);
		}
	);

	test('supports an async config factory and leaves production startup network-free', async () => {
		const options = optionsFor(await createRoot());
		const config = { basePath: '/app' };
		const factory = vi.fn(() => Promise.resolve(config));
		const context = { defaultConfig: {} };
		const wrapped = withConsentManifest(factory, options);
		expect(await wrapped('phase-production-server', context)).toBe(config);
		expect(factory).toHaveBeenCalledWith('phase-production-server', context);
		expect(options.fetch).not.toHaveBeenCalled();
	});

	test('aliases the generated-manifest specifier to the snapshot in both bundlers', async () => {
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
			optionsFor(root)
		);
		const config = await wrapped('phase-production-build', {
			defaultConfig: {},
		});
		const outputFile = join(root, 'c15t-manifest.ts');

		const turbopackAlias = config.turbopack?.resolveAlias ?? {};
		expect(turbopackAlias.existing).toBe('./existing.js');
		expect(
			resolve(
				process.cwd(),
				String(turbopackAlias['@c15t/nextjs/generated-manifest'])
			)
		).toBe(outputFile);

		const webpackConfig = config.webpack?.({}, {} as never) as {
			resolve: { alias: Record<string, string> };
		};
		expect(userWebpack).toHaveBeenCalledTimes(1);
		expect(webpackConfig.resolve.alias).toEqual({
			'@c15t/nextjs/generated-manifest$': outputFile,
			existing: '/existing.js',
		});
	});

	test('next build stops when the fetch fails and keeps the old file out', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const wrapped = withConsentManifest({}, options);
		await wrapped('phase-production-build', { defaultConfig: {} });
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		await expect(
			wrapped('phase-production-build', { defaultConfig: {} })
		).rejects.toThrow(
			"@c15t/nextjs/build: could not fetch the consent manifest from https://consent.example.com/manifest during the build (backend unavailable). Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to deploy with runtime fetching."
		);
	});

	test('next dev warns and writes an undefined export when the fetch fails', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const config = { basePath: '/app' };
		const wrapped = withConsentManifest(config, options);
		expect(
			await wrapped('phase-development-server', { defaultConfig: {} })
		).toMatchObject(config);
		const source = await readFile(join(root, 'c15t-manifest.ts'), 'utf8');
		expect(source).toContain("from 'c15t/next/static'");
		expect(source).toContain(
			'export const consentManifest: ConsentManifest | undefined = undefined;'
		);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'@c15t/nextjs/build: could not fetch the consent manifest from https://consent.example.com/manifest during dev (backend unavailable)'
			)
		);
		warn.mockRestore();
	});

	test.each([
		['onBuildError', { onBuildError: 'runtime' as const }, {}],
		['C15T_ON_BUILD_ERROR', {}, { C15T_ON_BUILD_ERROR: 'runtime' }],
	])('%s runtime lets next build continue', async (_name, setting, env) => {
		for (const [key, value] of Object.entries(env)) {
			vi.stubEnv(key, value);
		}
		const root = await createRoot();
		const options = { ...optionsFor(root), ...setting };
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		await withConsentManifest({}, options)('phase-production-build', {
			defaultConfig: {},
		});
		expect(warn).toHaveBeenCalledTimes(1);
		expect(await readFile(join(root, 'c15t-manifest.ts'), 'utf8')).toContain(
			'= undefined;'
		);
		warn.mockRestore();
		vi.unstubAllEnvs();
	});

	test('reads NEXT_PUBLIC_C15T_BACKEND_URL when backendURL is left out', async () => {
		vi.stubEnv('NEXT_PUBLIC_C15T_BACKEND_URL', 'https://env.example.com/api');
		const root = await createRoot();
		const { fetch, rootDir } = optionsFor(root);
		await withConsentManifest({}, { fetch, rootDir })(
			'phase-production-build',
			{ defaultConfig: {} }
		);
		expect(fetch).toHaveBeenCalledWith(
			'https://env.example.com/api/manifest',
			expect.any(Object)
		);
		vi.unstubAllEnvs();
	});

	test.each(['runtime', 'fail'] as const)(
		"skips the fetch for output: 'export' with onBuildError: %s",
		async (onBuildError) => {
			const root = await createRoot();
			const options = { ...optionsFor(root), onBuildError };
			const info = vi
				.spyOn(console, 'info')
				.mockImplementation(() => undefined);
			const wrapped = withConsentManifest({ output: 'export' }, options);
			await wrapped('phase-production-build', { defaultConfig: {} });
			expect(options.fetch).not.toHaveBeenCalled();
			expect(await readFile(join(root, 'c15t-manifest.ts'), 'utf8')).toContain(
				'= undefined;'
			);
			expect(info).toHaveBeenCalledWith(
				expect.stringContaining("`output: 'export'`")
			);
			info.mockRestore();
		}
	);
});
