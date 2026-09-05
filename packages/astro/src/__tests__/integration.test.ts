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

const runSetup = function runSetup(options: C15tAstroOptions) {
	const integration = c15t(options);
	const calls: SetupCalls = {
		addMiddleware: vi.fn(),
		injectRoute: vi.fn(),
		injectScript: vi.fn(),
		updateConfig: vi.fn(),
	};
	integration.hooks['astro:config:setup']?.(
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
	const logger = { error: vi.fn() };
	return () =>
		integration.hooks['astro:config:done']?.({
			config: { integrations: integrationNames.map((name) => ({ name })) },
			logger,
		} as unknown as Parameters<
			NonNullable<(typeof integration)['hooks']['astro:config:done']>
		>[0]);
};

describe('resolveOptions', () => {
	it('defaults the ui adapter to svelte', () => {
		expect(resolveOptions({ mode: offlineMode() }).ui).toBe('svelte');
	});

	it('enables the injected routes only for manifest mode', () => {
		expect(resolveOptions({ mode: offlineMode() }).endpoints.enabled).toBe(
			false
		);
		expect(resolveOptions({ mode: manifestMode() }).endpoints.enabled).toBe(
			true
		);
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
			requireSvelte: false,
		});
		expect(resolved).not.toHaveProperty('middleware');
		expect(resolved).not.toHaveProperty('requireSvelte');
	});
});

describe('astro:config:setup', () => {
	it('registers the middleware before user middleware', () => {
		const { calls } = runSetup({ mode: hostedMode({ url: '/api/c15t' }) });
		expect(calls.addMiddleware).toHaveBeenCalledWith({
			entrypoint: '@c15t/astro/middleware',
			order: 'pre',
		});
	});

	it('skips the middleware when disabled', () => {
		const { calls } = runSetup({ middleware: false, mode: offlineMode() });
		expect(calls.addMiddleware).not.toHaveBeenCalled();
	});

	it('injects a page-level boot script', () => {
		const { calls } = runSetup({ mode: offlineMode() });
		const [stage, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(stage).toBe('page');
		expect(code).toContain("import options from 'virtual:c15t/options'");
		expect(code).toContain("import { boot } from '@c15t/astro/client'");
		expect(code).toContain('boot(options);');
	});

	it('threads a client entrypoint into the boot script', () => {
		const { calls } = runSetup({
			clientEntrypoint: './src/c15t.client.ts',
			mode: offlineMode(),
		});
		const [, code] = calls.injectScript.mock.calls[0] as [string, string];
		expect(code).toContain("import clientOptions from './src/c15t.client.ts'");
		expect(code).toContain('boot(options, clientOptions);');
	});

	it('serves the serialized options from the virtual module', () => {
		const { calls } = runSetup({
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

	it('injects the init and manifest routes in manifest mode', () => {
		const { calls } = runSetup({
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

	it('injects no routes in hosted mode', () => {
		const { calls } = runSetup({ mode: hostedMode({ url: '/api/c15t' }) });
		expect(calls.injectRoute).not.toHaveBeenCalled();
	});
});

describe('astro:config:done', () => {
	it('fails clearly when @astrojs/svelte is missing', () => {
		expect(runDone({ mode: offlineMode() }, [])).toThrowError(
			/missing @astrojs\/svelte/u
		);
	});

	it('passes when @astrojs/svelte is installed', () => {
		expect(runDone({ mode: offlineMode() }, ['@astrojs/svelte'])).not.toThrow();
	});

	it('passes for a banner-only site', () => {
		expect(
			runDone({ mode: offlineMode(), requireSvelte: false }, [])
		).not.toThrow();
	});
});
