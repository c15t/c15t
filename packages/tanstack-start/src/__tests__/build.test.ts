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

/**
 * What a production chunk that reads every export ends up with: the module
 * as loaded, with the stand-ins filled in after tree-shaking.
 */
const buildGenerated = async (
	plugin: Plugin,
	consumer: 'client' | 'server'
): Promise<string> => {
	const source = (await loadGenerated(plugin, consumer)) as string;
	return (await plugin.renderChunk(source))?.code ?? source;
};

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
		expect(await buildGenerated(plugin, 'server')).toContain('tanstack-build');
		const client = await buildGenerated(plugin, 'client');
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
		const plugin = consentManifest({
			backendURL: 'https://consent.example.com',
			fetch: failingFetch(),
		});
		plugin.configResolved({ command: 'build', root });
		await expect(buildGenerated(plugin, 'server')).rejects.toThrow(
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
		const plugin = consentManifest({ fetch: fetchSpy });
		plugin.configResolved({
			command: 'build',
			env: { VITE_C15T_BACKEND_URL: 'https://env.example.com' },
			root,
		});
		await buildGenerated(plugin, 'server');
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
		const server = await buildGenerated(plugin, 'server');
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(logger.warn).not.toHaveBeenCalled();
		expect(server).toContain('export const snapshot = void 0;');
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
		const plugin = consentManifest({
			backendURL: 'https://consent.example.com',
			fetch: fetchSpy,
		});
		plugin.configResolved({ env, root: await tempRoot() });
		await buildGenerated(plugin, 'server');
		expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
			'https://consent.example.com/manifest'
		);
		expect(env.VITE_C15T_BACKEND_URL).toBe('/api/c15t');
	});

	test('vite build fails without a backend URL', async () => {
		const plugin = consentManifest();
		plugin.configResolved({
			command: 'build',
			env: {},
			root: await tempRoot(),
		});
		await expect(buildGenerated(plugin, 'server')).rejects.toThrow(
			/VITE_C15T_BACKEND_URL \(or VITE_INTH_PROJECT_URL\)/u
		);
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
		expect(await loadGenerated(plugin, 'server')).toContain(
			'export const snapshot = undefined;'
		);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('VITE_C15T_BACKEND_URL')
		);
	});
});

describe('TanStack Start backend URL variables', () => {
	/** The `backendURL` the generated module exports, for the given env. */
	const resolveBackendURL = async (
		env: Record<string, unknown>,
		options: { backendURL?: string } = {}
	) => {
		const root = await mkdtemp(join(tmpdir(), 'c15t-inth-env-'));
		try {
			const plugin = consentManifest({
				...options,
				fetch: vi
					.fn<typeof globalThis.fetch>()
					.mockRejectedValue(new Error('unreachable')),
				onBuildError: 'runtime',
			});
			await plugin.configResolved({
				command: 'serve',
				env,
				logger: { info: () => undefined, warn: () => undefined },
				root,
			});
			const source = String(
				await plugin.load.call(
					{ environment: { config: { consumer: 'server' } } },
					plugin.resolveId('@c15t/core/generated') as string
				)
			);
			return {
				backendURL: /export const backendURL = "(?<url>[^"]*)";/u.exec(source)
					?.groups?.url,
				env,
			};
		} finally {
			await rm(root, { force: true, recursive: true });
		}
	};
	const INTH = 'https://inth.example.com';
	const C15T = 'https://c15t.example.com';

	test('VITE_INTH_PROJECT_URL alone gives the backend URL', async () => {
		const { backendURL, env } = await resolveBackendURL({
			VITE_INTH_PROJECT_URL: INTH,
		});
		expect(backendURL).toBe(INTH);
		expect(env.VITE_C15T_BACKEND_URL).toBe(INTH);
	});

	test('VITE_C15T_BACKEND_URL wins when both are set', async () => {
		const { backendURL } = await resolveBackendURL({
			VITE_C15T_BACKEND_URL: C15T,
			VITE_INTH_PROJECT_URL: INTH,
		});
		expect(backendURL).toBe(C15T);
	});

	test('an explicit backendURL beats both variables', async () => {
		const { backendURL } = await resolveBackendURL(
			{ VITE_C15T_BACKEND_URL: C15T, VITE_INTH_PROJECT_URL: INTH },
			{ backendURL: 'https://option.example.com' }
		);
		expect(backendURL).toBe('https://option.example.com');
	});
});
