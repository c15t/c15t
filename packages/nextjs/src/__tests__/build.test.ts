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

	test('reads the backend URL from NEXT_PUBLIC_C15T_BACKEND_URL', async () => {
		vi.stubEnv('NEXT_PUBLIC_C15T_BACKEND_URL', 'https://env.example.com');
		const { backendURL: _unused, ...options } = optionsFor(await createRoot());
		const wrapped = withConsentManifest({}, options);
		await wrapped('phase-production-build', { defaultConfig: {} });
		expect(options.fetch).toHaveBeenCalledWith(
			'https://env.example.com/manifest',
			expect.any(Object)
		);
		vi.unstubAllEnvs();
	});

	test('fails the build instead of accepting an old snapshot after a fetch failure', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const wrapped = withConsentManifest({}, options);
		await wrapped('phase-production-build', { defaultConfig: {} });
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		await expect(
			wrapped('phase-production-build', { defaultConfig: {} })
		).rejects.toThrow('backend unavailable');
	});
});
