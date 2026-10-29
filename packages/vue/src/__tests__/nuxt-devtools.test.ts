import { runWithNuxtContext } from '@nuxt/kit';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import {
	DEVTOOLS_ICON_ROUTE,
	DEVTOOLS_PAGE_ROUTE,
} from '../runtime/devtools/constants';

type Nuxt = Parameters<typeof runWithNuxtContext>[0];
type NuxtModule = (
	inlineOptions: Record<string, unknown>,
	nuxt: Nuxt
) => Promise<unknown>;

let module: NuxtModule;
beforeAll(async () => {
	({ default: module } = await vi.importActual<{ default: NuxtModule }>(
		'../module'
	));
}, 30_000);

const setupModule = async (
	options: {
		baseURL?: string;
		dev?: boolean;
		devtools?: boolean | { enabled?: boolean };
		moduleDevtools?: boolean;
	} = {}
) => {
	const hook = vi.fn(
		(_name: string, _callback: (...args: unknown[]) => unknown) => () =>
			undefined
	);
	const nuxt = {
		_version: '4.5.1',
		hook,
		hooks: { addHooks: () => undefined, hook },
		options: {
			_requiredModules: {},
			alias: {},
			app: { baseURL: options.baseURL ?? '/' },
			build: { templates: [], transpile: [] },
			buildDir: '/virtual/.nuxt',
			c15t: {
				backendURL: '/api/c15t',
				devtools: options.moduleDevtools,
			},
			dev: options.dev ?? true,
			devtools: options.devtools,
			experimental: {},
			imports: {},
			nitro: {},
			plugins: [],
			rootDir: '/virtual',
			runtimeConfig: { public: {} },
			serverHandlers: [],
			srcDir: '/virtual',
			ssr: true,
			vite: {},
		},
	} as unknown as Nuxt;
	await runWithNuxtContext(nuxt, () => module({}, nuxt));
	return { hook, nuxt };
};

describe('Nuxt DevTools tab registration', () => {
	test.each(['/', '/dashboard/'])(
		'loads the tab and icon under app.baseURL %s',
		async (baseURL) => {
			const { hook, nuxt } = await setupModule({ baseURL });
			const registerTabs = hook.mock.calls.find(
				([name]) => name === 'devtools:customTabs'
			)?.[1];
			expect(registerTabs).toBeTypeOf('function');
			const tabs: unknown[] = [];
			registerTabs?.(tabs);
			expect(tabs).toEqual([
				{
					category: 'app',
					icon: `${baseURL}${DEVTOOLS_ICON_ROUTE.slice(1)}`,
					name: 'c15t',
					title: 'c15t',
					view: {
						src: `${baseURL}${DEVTOOLS_PAGE_ROUTE.slice(1)}`,
						type: 'iframe',
					},
				},
			]);
			expect(nuxt.options.serverHandlers).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						method: 'get',
						route: DEVTOOLS_PAGE_ROUTE,
					}),
					expect.objectContaining({
						method: 'get',
						route: DEVTOOLS_ICON_ROUTE,
					}),
				])
			);
			const { plugins } = nuxt.options;
			const consentPluginIndex = plugins.findIndex(
				(plugin) =>
					typeof plugin === 'object' &&
					plugin.src.includes('/runtime/plugin.nuxt')
			);
			const bridgePluginIndex = plugins.findIndex(
				(plugin) =>
					typeof plugin === 'object' &&
					plugin.mode === 'client' &&
					plugin.src.includes('/runtime/devtools/plugin.nuxt')
			);
			expect(consentPluginIndex).toBeGreaterThanOrEqual(0);
			expect(bridgePluginIndex).toBeGreaterThan(consentPluginIndex);
		}
	);

	test.each([
		{ dev: false },
		{ devtools: false },
		{ devtools: { enabled: false } },
		{ moduleDevtools: false },
	])('excludes development routes and the bridge with %j', async (options) => {
		const { hook, nuxt } = await setupModule(options);
		expect(
			hook.mock.calls.some(([name]) => name === 'devtools:customTabs')
		).toBe(false);
		expect(
			nuxt.options.serverHandlers.some((handler) =>
				handler.route?.startsWith(DEVTOOLS_PAGE_ROUTE)
			)
		).toBe(false);
		expect(
			nuxt.options.plugins.some(
				(plugin) =>
					typeof plugin === 'object' &&
					plugin.src.includes('/runtime/devtools/plugin.nuxt')
			)
		).toBe(false);
	});
});
