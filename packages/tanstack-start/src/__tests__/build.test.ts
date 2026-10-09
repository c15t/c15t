import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { consentManifest } from '../build';

const directories: string[] = [];

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('TanStack Start manifest generation', () => {
	test.each([
		{ expectedImport: 'c15t/tanstack-start/static', settings: {} },
		{
			expectedImport: 'c15t/tanstack-start/static',
			settings: { importSource: undefined },
		},
		{
			expectedImport: '@c15t/tanstack-start/static',
			settings: { importSource: '@c15t/tanstack-start/static' },
		},
	])(
		'generates the configured type import with settings $settings',
		async ({ expectedImport, settings }) => {
			const root = await mkdtemp(join(tmpdir(), 'c15t-tanstack-manifest-'));
			directories.push(root);
			const fetchSpy = vi.fn<typeof globalThis.fetch>(() =>
				Promise.resolve(
					Response.json({
						branding: 'c15t',
						revision: 'tanstack-build',
						schemaVersion: 2,
					})
				)
			);
			await consentManifest({
				...settings,
				backendURL: 'https://consent.example.com',
				fetch: fetchSpy,
			}).configResolved({ root });
			const source = await readFile(join(root, 'src/c15t-manifest.ts'), 'utf8');
			expect(source).toContain(`from '${expectedImport}'`);
			expect(source).toContain('satisfies ConsentManifest');
		}
	);
});

describe('TanStack Start manifest backend URL', () => {
	const manifestResponse = () =>
		vi.fn<typeof globalThis.fetch>(() =>
			Promise.resolve(
				Response.json({
					branding: 'c15t',
					revision: 'tanstack-build',
					schemaVersion: 2,
				})
			)
		);

	const tempRoot = async () => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-tanstack-manifest-'));
		directories.push(root);
		return root;
	};

	test('reads VITE_C15T_BACKEND_URL when backendURL is omitted', async () => {
		const fetchSpy = manifestResponse();
		const env: Record<string, unknown> = {
			VITE_C15T_BACKEND_URL: 'https://env.example.com',
		};
		await consentManifest({ fetch: fetchSpy }).configResolved({
			env,
			root: await tempRoot(),
		});
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://env.example.com/manifest'
		);
		expect(env.VITE_C15T_BACKEND_URL).toBe('https://env.example.com');
	});

	test('exposes an explicit backendURL to the app when the variable is unset', async () => {
		const fetchSpy = manifestResponse();
		const env: Record<string, unknown> = {};
		await consentManifest({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
		}).configResolved({ env, root: await tempRoot() });
		expect(env.VITE_C15T_BACKEND_URL).toBe('https://consent.example.com');
	});

	test('keeps a variable the app already set', async () => {
		const fetchSpy = manifestResponse();
		const env: Record<string, unknown> = {
			VITE_C15T_BACKEND_URL: '/api/c15t',
		};
		await consentManifest({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
		}).configResolved({ env, root: await tempRoot() });
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://consent.example.com/manifest'
		);
		expect(env.VITE_C15T_BACKEND_URL).toBe('/api/c15t');
	});

	test('throws without a backend URL', async () => {
		await expect(
			consentManifest().configResolved({ env: {}, root: await tempRoot() })
		).rejects.toThrow(/VITE_C15T_BACKEND_URL/u);
	});
});
