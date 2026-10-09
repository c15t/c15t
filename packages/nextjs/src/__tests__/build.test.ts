import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
			expect(await wrapped(phase, { defaultConfig: {} })).toBe(config);
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

	test('keeps building with a runtime fallback when the fetch fails', async () => {
		const root = await createRoot();
		const options = optionsFor(root);
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const config = { basePath: '/app' };
		const wrapped = withConsentManifest(config, options);
		await wrapped('phase-production-build', { defaultConfig: {} });
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		expect(await wrapped('phase-production-build', { defaultConfig: {} })).toBe(
			config
		);
		const source = await readFile(join(root, 'c15t-manifest.ts'), 'utf8');
		expect(source).toContain("from 'c15t/next/static'");
		expect(source).toContain(
			'export const consentManifest: ConsentManifest | undefined = undefined;'
		);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'@c15t/nextjs/build: could not fetch the consent manifest during the build (backend unavailable)'
			)
		);
		warn.mockRestore();
	});

	test("fails the build with onBuildError: 'fail' instead of accepting an old snapshot", async () => {
		const root = await createRoot();
		const options = { ...optionsFor(root), onBuildError: 'fail' as const };
		const wrapped = withConsentManifest({}, options);
		await wrapped('phase-production-build', { defaultConfig: {} });
		options.fetch.mockRejectedValue(new Error('backend unavailable'));
		await expect(
			wrapped('phase-production-build', { defaultConfig: {} })
		).rejects.toThrow('backend unavailable');
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
