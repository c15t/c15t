import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { consentManifest } from '../build';

const directories: string[] = [];

type Plugin = ReturnType<typeof consentManifest>;

/** What `@c15t/core/generated` holds in one Vite environment. */
const loadGenerated = (plugin: Plugin, consumer: 'client' | 'server') =>
	plugin.load.call(
		{ environment: { config: { consumer } } },
		plugin.resolveId('@c15t/core/generated') as string
	);

afterEach(async () => {
	await Promise.all(
		directories
			.splice(0)
			.map((directory) => rm(directory, { force: true, recursive: true }))
	);
});

describe('TanStack Start manifest generation', () => {
	test('serves the snapshot to the server and keeps it out of the client', async () => {
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
		const plugin = consentManifest({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
		});
		await plugin.configResolved({ root });
		expect(await loadGenerated(plugin, 'server')).toContain('tanstack-build');
		const client = await loadGenerated(plugin, 'client');
		expect(client).not.toContain('tanstack-build');
		expect(client).toContain('export const snapshot = undefined;');
		expect(client).toContain(
			'export const backendURL = "https://consent.example.com";'
		);
	});

	const createRoot = async () => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-tanstack-manifest-'));
		directories.push(root);
		return root;
	};
	const failingFetch = () =>
		vi
			.fn<typeof globalThis.fetch>()
			.mockRejectedValue(new Error('backend unavailable'));

	test('vite dev warns and serves an undefined snapshot when the fetch fails', async () => {
		const root = await createRoot();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const plugin = consentManifest({
			backendURL: 'https://consent.example.com',
			fetch: failingFetch(),
		});
		await plugin.configResolved({ command: 'serve', logger, root });
		expect(await loadGenerated(plugin, 'server')).toContain(
			'export const snapshot = undefined;'
		);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining(
				'@c15t/tanstack-start/build: could not fetch the consent manifest from https://consent.example.com/manifest during dev (backend unavailable). The server fetches it at runtime instead.'
			)
		);
	});

	test('vite build stops when the fetch fails', async () => {
		const root = await createRoot();
		await expect(
			consentManifest({
				backendURL: 'https://consent.example.com',
				fetch: failingFetch(),
			}).configResolved({ command: 'build', root })
		).rejects.toThrow(
			"during the build (backend unavailable). Set `C15T_ON_BUILD_ERROR=runtime` (or `onBuildError: 'runtime'`) to deploy with runtime fetching."
		);
	});

	test('reads VITE_C15T_BACKEND_URL when backendURL is left out', async () => {
		const root = await createRoot();
		const fetchSpy = vi.fn<typeof globalThis.fetch>(() =>
			Promise.resolve(
				Response.json({
					branding: 'c15t',
					revision: 'tanstack-build',
					schemaVersion: 2,
				})
			)
		);
		await consentManifest({ fetch: fetchSpy }).configResolved({
			command: 'build',
			env: { VITE_C15T_BACKEND_URL: 'https://env.example.com' },
			root,
		});
		expect(fetchSpy).toHaveBeenCalledWith(
			'https://env.example.com/manifest',
			expect.any(Object)
		);
	});

	test('skips the fetch for a relative backendURL', async () => {
		const root = await createRoot();
		const fetchSpy = failingFetch();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const plugin = consentManifest({
			backendURL: '/api/c15t',
			fetch: fetchSpy,
		});
		await plugin.configResolved({ command: 'build', logger, root });
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
		expect(await loadGenerated(plugin, 'server')).toContain(
			'export const snapshot = undefined;'
		);
	});
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

	test('vite build fails without a backend URL', async () => {
		await expect(
			consentManifest().configResolved({
				command: 'build',
				env: {},
				root: await tempRoot(),
			})
		).rejects.toThrow(/VITE_C15T_BACKEND_URL/u);
	});

	test('vite dev warns without a backend URL', async () => {
		const root = await tempRoot();
		const logger = { info: vi.fn(), warn: vi.fn() };
		const plugin = consentManifest();
		await plugin.configResolved({
			command: 'serve',
			env: {},
			logger,
			root,
		});
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('VITE_C15T_BACKEND_URL')
		);
		expect(await loadGenerated(plugin, 'server')).toContain(
			'export const snapshot = undefined;'
		);
	});
});
