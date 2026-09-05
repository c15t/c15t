import { describe, expect, it, vi } from 'vitest';

import { c15t, resolveOptions } from '../integration';
import { hostedMode, manifestMode, offlineMode } from '../mode';
import type { C15tAstroOptions } from '../types';

interface SetupCalls {
	addMiddleware: ReturnType<typeof vi.fn>;
	injectRoute: ReturnType<typeof vi.fn>;
	injectScript: ReturnType<typeof vi.fn>;
	updateConfig: ReturnType<typeof vi.fn>;
}

const runSetup = async function runSetup(options: C15tAstroOptions) {
	const integration = c15t(options);
	const calls: SetupCalls = {
		addMiddleware: vi.fn(),
		injectRoute: vi.fn(),
		injectScript: vi.fn(),
		updateConfig: vi.fn(),
	};
	await integration.hooks['astro:config:setup']?.(
		calls as unknown as Parameters<
			NonNullable<(typeof integration)['hooks']['astro:config:setup']>
		>[0]
	);
	return { calls, integration };
};

const runDone = function runDone(
	options: C15tAstroOptions,
	integrationNames: string[]
) {
	const integration = c15t(options);
	const logger = { error: vi.fn(), warn: vi.fn() };
	const run = () =>
		integration.hooks['astro:config:done']?.({
			config: { integrations: integrationNames.map((name) => ({ name })) },
			logger,
		} as unknown as Parameters<
			NonNullable<(typeof integration)['hooks']['astro:config:done']>
		>[0]);
	return Object.assign(run, { logger });
};

describe('resolveOptions', () => {
	it('defaults the ui adapter to svelte', () => {
		expect(resolveOptions({ mode: offlineMode() }).ui).toBe('svelte');
	});

	it('enables the injected routes only for manifest mode', () => {
		expect(resolveOptions({ mode: offlineMode() }).endpoints.enabled).toBe(
			false
		);
		expect(
			resolveOptions({
				mode: manifestMode({ backendURL: 'https://consent.example.com' }),
			}).endpoints.enabled
		).toBe(true);
		expect(resolveOptions({ mode: manifestMode() }).endpoints.enabled).toBe(
			true
		);
	});

	it('rejects a manifestURL with nowhere to save consent', () => {
		// The injected routes serve init and manifest; `POST /subjects` is
		// the backend's, so a `manifestURL` without one would 404 on save.
		expect(() =>
			resolveOptions({ mode: manifestMode({ manifestURL: '/m.json' }) })
		).toThrowError(/also needs a .backendURL./u);
		expect(
			resolveOptions({
				mode: manifestMode({
					backendURL: 'https://consent.example.com',
					manifestURL: '/m.json',
				}),
			}).mode
		).toMatchObject({ backendURL: 'https://consent.example.com' });
	});

	it('keeps custom route paths', () => {
		const resolved = resolveOptions({
			endpoints: { enabled: true, initPath: '/consent/init' },
			mode: offlineMode(),
		});
		expect(resolved.endpoints.initPath).toBe('/consent/init');
		expect(resolved.endpoints.manifestPath).toBe('/api/c15t/manifest');
	});

	it('rejects a missing mode', () => {
		expect(() =>
			resolveOptions({} as unknown as C15tAstroOptions)
		).toThrowError(/`mode` is required/u);
	});

	it('drops build-only options from the serialized shape', () => {
		const resolved = resolveOptions({
			middleware: false,
			mode: offlineMode(),
			requireUIIntegration: false,
		});
		expect(resolved).not.toHaveProperty('middleware');
		expect(resolved).not.toHaveProperty('requireUIIntegration');
	});

	it('keeps an explicit ui adapter', () => {
		expect(resolveOptions({ mode: offlineMode(), ui: 'react' }).ui).toBe(
			'react'
		);
		expect(resolveOptions({ mode: offlineMode(), ui: 'vue' }).ui).toBe('vue');
	});
});

describe('astro:config:setup', () => {
	it('registers the middleware before user middleware', async () => {
		const { calls } = await runSetup({
			mode: hostedMode({ url: '/api/c15t' }),
		});
		expect(calls.addMiddleware).toHaveBeenCalledWith({
			entrypoint: '@c15t/astro/middleware',
			order: 'pre',
		});
	});

	it('skips the middleware when disabled', async () => {
		const { calls } = await runSetup({
			middleware: false,
			mode: offlineMode(),
		});
		expect(calls.addMiddleware).not.toHaveBeenCalled();
	});

	it('injects a page-level boot script', async () => {
		const { calls } = await runSetup({ mode: offlineMode() });
		const [stage, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(stage).toBe('page');
		expect(code).toContain("import options from 'virtual:c15t/options'");
		expect(code).toContain("from '@c15t/astro/client'");
		expect(code).toContain('boot(options);');
	});

	it.each([
		['svelte', '@c15t/astro/ui/svelte', 'consent-dialog-surface.svelte'],
		['react', '@c15t/astro/ui/react', 'consent-dialog-surface.tsx'],
		['vue', '@c15t/astro/ui/vue', 'consent-dialog-surface.vue'],
	] as const)(
		'registers only the %s adapter and island',
		async (ui, adapterModule, surfaceFile) => {
			const { calls } = await runSetup({ mode: offlineMode(), ui });
			const [, code] = calls.injectScript.mock.calls[0] as [string, string];

			expect(code).toContain(`registerDialogAdapter('${ui}'`);
			expect(code).toContain(`import('${adapterModule}')`);
			expect(code).toContain(`import('@c15t/astro/islands/${surfaceFile}')`);

			// The point of injecting these: a build must never see a specifier
			// for a framework the site did not ask for.
			for (const other of ['svelte', 'react', 'vue'].filter(
				(name) => name !== ui
			)) {
				expect(code).not.toContain(`@c15t/astro/ui/${other}`);
			}
		}
	);

	it('keeps both island specifiers behind import()', async () => {
		const { calls } = await runSetup({ mode: offlineMode(), ui: 'react' });
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).not.toMatch(/^import\s[^;]*@c15t\/astro\/(?:ui|islands)\//mu);
	});

	it('threads a client entrypoint into the boot script', async () => {
		const { calls } = await runSetup({
			clientEntrypoint: './src/c15t.client.ts',
			mode: offlineMode(),
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain("import clientOptions from './src/c15t.client.ts'");
		expect(code).toContain('boot(options, clientOptions);');
	});

	it('serves the serialized options from the virtual module', async () => {
		const { calls } = await runSetup({
			consentCategories: ['necessary', 'measurement'],
			mode: hostedMode({ url: 'https://consent.example.com' }),
		});
		const [config] = calls.updateConfig.mock.calls[0] as [
			{
				vite: {
					plugins: {
						resolveId: (id: string) => string;
						load: (id: string) => string;
					}[];
				};
			},
		];
		const [plugin] = config.vite.plugins;
		const resolved = plugin?.resolveId('virtual:c15t/options') as string;
		expect(resolved).toBe('\0virtual:c15t/options');

		const loaded = plugin?.load(resolved) as string;
		const parsed = JSON.parse(
			loaded.replace(/^export default /u, '').replace(/;$/u, '')
		);
		expect(parsed.mode).toEqual({
			type: 'hosted',
			url: 'https://consent.example.com',
		});
		expect(parsed.consentCategories).toEqual(['necessary', 'measurement']);
	});

	it("shims Nuxt's #imports for the vue adapter only", async () => {
		const withVue = await runSetup({ mode: offlineMode(), ui: 'vue' });
		const [vueConfig] = withVue.calls.updateConfig.mock.calls[0] as [
			{ vite: { plugins: { name: string }[] } },
		];
		expect(vueConfig.vite.plugins.map((plugin) => plugin.name)).toEqual([
			'c15t:options',
			'@c15t/vue',
		]);

		const withSvelte = await runSetup({ mode: offlineMode() });
		const [svelteConfig] = withSvelte.calls.updateConfig.mock.calls[0] as [
			{ vite: { plugins: { name: string }[] } },
		];
		expect(svelteConfig.vite.plugins.map((plugin) => plugin.name)).toEqual([
			'c15t:options',
		]);
	});

	it('injects the init and manifest routes in manifest mode', async () => {
		const { calls } = await runSetup({
			mode: manifestMode({ backendURL: 'https://consent.example.com' }),
		});
		expect(calls.injectRoute).toHaveBeenCalledWith({
			entrypoint: '@c15t/astro/api/init',
			pattern: '/api/c15t/init',
			prerender: false,
		});
		expect(calls.injectRoute).toHaveBeenCalledWith({
			entrypoint: '@c15t/astro/api/manifest',
			pattern: '/api/c15t/manifest',
			prerender: false,
		});
	});

	it('injects no routes in hosted mode', async () => {
		const { calls } = await runSetup({
			mode: hostedMode({ url: '/api/c15t' }),
		});
		expect(calls.injectRoute).not.toHaveBeenCalled();
	});
});

describe('astro:config:done', () => {
	it.each([
		['svelte', '@astrojs/svelte'],
		['react', '@astrojs/react'],
		['vue', '@astrojs/vue'],
	] as const)(
		'fails clearly when %s is selected without %s',
		(ui, astroIntegration) => {
			const run = runDone({ mode: offlineMode(), ui }, []);
			expect(run).toThrowError(
				new RegExp(`ui: "${ui}" needs ${astroIntegration}`, 'u')
			);
		}
	);

	it('names every package to install in the error log', () => {
		const run = runDone({ mode: offlineMode(), ui: 'react' }, []);
		expect(run).toThrow();
		expect(run.logger.error).toHaveBeenCalledWith(
			expect.stringContaining('@astrojs/react, @c15t/react, react, react-dom')
		);
	});

	it.each([
		['svelte', '@astrojs/svelte'],
		['react', '@astrojs/react'],
		['vue', '@astrojs/vue'],
	] as const)('passes when %s has %s installed', (ui, astroIntegration) => {
		expect(
			runDone({ mode: offlineMode(), ui }, [astroIntegration])
		).not.toThrow();
	});

	it('passes for a banner-only site', () => {
		expect(
			runDone({ mode: offlineMode(), requireUIIntegration: false }, [])
		).not.toThrow();
	});

	it.each(['@astrojs/react', '@astrojs/vue'])(
		'suggests reusing %s when ui was left at the default',
		(astroIntegration) => {
			const run = runDone({ mode: offlineMode() }, [
				'@astrojs/svelte',
				astroIntegration,
			]);
			run();
			expect(run.logger.warn).toHaveBeenCalledWith(
				expect.stringContaining(astroIntegration)
			);
		}
	);

	it('never switches the adapter on its own', async () => {
		const options: C15tAstroOptions = { mode: offlineMode() };
		runDone(options, ['@astrojs/svelte', '@astrojs/react'])();

		// The suggestion is advice, not a decision: the page still boots the
		// Svelte island until someone sets `ui` themselves.
		const { calls } = await runSetup(options);
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain("registerDialogAdapter('svelte'");
		expect(code).not.toContain('@c15t/astro/ui/react');
	});

	it('stays quiet when ui was chosen explicitly', () => {
		const run = runDone({ mode: offlineMode(), ui: 'svelte' }, [
			'@astrojs/svelte',
			'@astrojs/react',
		]);
		run();
		expect(run.logger.warn).not.toHaveBeenCalled();
	});
});
