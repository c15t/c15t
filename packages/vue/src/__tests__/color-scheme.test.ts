import { hosted } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { createApp, createSSRApp, defineComponent, h, toValue } from 'vue';
import type { App } from 'vue';

import { c15tVue, generateTokensCSS } from '../index';
import type { C15tVuePluginOptions } from '../index';

const nuxt = vi.hoisted(() => ({
	appConfig: {} as Record<string, unknown>,
	head: [] as unknown[],
	state: new Map<string, unknown>(),
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; the test records what the plugin hands to useHead.
vi.mock('#imports', async () => {
	const { shallowRef: makeRef } = await import('vue');
	return {
		defineNuxtPlugin: (plugin: unknown) => plugin,
		useAppConfig: () => ({ c15t: nuxt.appConfig }),
		useFetch: () => Promise.resolve({ data: makeRef(undefined) }),
		useHead: (input: unknown) => {
			nuxt.head.push(input);
		},
		useRequestEvent: () => undefined,
		useRequestHeaders: () => ({}),
		useRuntimeConfig: () => ({
			public: { c15t: { backendURL: 'https://consent.example.test' } },
		}),
		useState: (key: string, init: () => unknown) => {
			if (!nuxt.state.has(key)) {
				nuxt.state.set(key, makeRef(init()));
			}
			return nuxt.state.get(key);
		},
	};
});

type NuxtPlugin = (app: {
	hook: (name: string, callback: () => void) => void;
	payload: { prerenderedAt?: number };
	vueApp: App;
}) => Promise<void>;

let plugin: NuxtPlugin;
beforeAll(async () => {
	({ default: plugin } = await vi.importActual<{ default: NuxtPlugin }>(
		'../runtime/plugin.nuxt'
	));
}, 30_000);

const root = () => document.documentElement;
const isDark = () => root().classList.contains('c15t-dark');

/** A `prefers-color-scheme: dark` query the test can flip. */
const stubSystemScheme = (dark: boolean) => {
	const listeners = new Set<(event: { matches: boolean }) => void>();
	const query = {
		addEventListener: (_type: string, listener: never) => {
			listeners.add(listener);
		},
		matches: dark,
		removeEventListener: (_type: string, listener: never) => {
			listeners.delete(listener);
		},
	};
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => query)
	);
	return {
		listeners,
		set(next: boolean) {
			query.matches = next;
			for (const listener of listeners) {
				listener({ matches: next });
			}
		},
	};
};

const failingFetch = () =>
	vi.stubGlobal(
		'fetch',
		vi.fn(() => Promise.resolve(new Response('{}', { status: 503 })))
	);

const apps = new Set<App>();
const mounted = new Set<App>();

const mount = (app: App) => {
	const container = document.createElement('div');
	document.body.append(container);
	app.mount(container);
	mounted.add(app);
};

/** Install the plugin. The app is unmounted after the test. */
const installVue = (options: C15tVuePluginOptions) => {
	failingFetch();
	const app = createApp(defineComponent({ setup: () => () => h('main') }));
	app.use(c15tVue, options);
	apps.add(app);
	return app;
};

afterEach(() => {
	// Unmounting releases the listeners and observers the plugin started,
	// which would otherwise keep changing the class in later tests.
	for (const app of apps) {
		if (!mounted.has(app)) {
			mount(app);
		}
		app.unmount();
	}
	apps.clear();
	mounted.clear();
	vi.unstubAllGlobals();
	nuxt.appConfig = {};
	nuxt.head.length = 0;
	nuxt.state.clear();
	root().className = '';
	document.head.replaceChildren();
	document.body.replaceChildren();
});

describe('generateTokensCSS with dark tokens', () => {
	test('writes theme.dark colors under the dark selectors', () => {
		const css = generateTokensCSS(undefined, {
			theme: { dark: { primary: '#40e0d0' } },
		});
		expect(css).toMatch(/\.c15t-dark[^{]*\{[^}]*--c15t-primary: #40e0d0;/u);
	});

	test('switches to the dark tokens by media query for system', () => {
		const css = generateTokensCSS(undefined, { colorScheme: 'system' });
		expect(css).toMatch(
			/@media\(prefers-color-scheme:dark\)\{[^{]*\{[^}]*--c15t-surface: hsl\(0, 0%, 7%\);/u
		);
	});

	test('puts the dark tokens on the root for dark', () => {
		const css = generateTokensCSS(undefined, {
			colorScheme: 'dark',
			theme: { dark: { primary: '#40e0d0' } },
		});
		expect(css).toMatch(/:root:root[^{]*\{[^}]*--c15t-primary: #40e0d0;/u);
		expect(css).not.toContain('@media');
	});

	test('adds nothing without a theme or color scheme', () => {
		expect(generateTokensCSS()).not.toContain('c15t-dark');
		expect(generateTokensCSS(undefined, { colorScheme: null })).not.toContain(
			'c15t-dark'
		);
	});
});

describe('the Vue plugin applies colorScheme', () => {
	test('dark adds c15t-dark before the app mounts', () => {
		stubSystemScheme(false);
		installVue({ colorScheme: 'dark' });
		expect(isDark()).toBe(true);
	});

	test('light removes a c15t-dark class', () => {
		stubSystemScheme(true);
		root().classList.add('c15t-dark');
		installVue({ colorScheme: 'light' });
		expect(isDark()).toBe(false);
	});

	test('system follows prefers-color-scheme as it changes', () => {
		const system = stubSystemScheme(true);
		const app = installVue({ colorScheme: 'system' });
		expect(isDark()).toBe(true);

		system.set(false);
		expect(isDark()).toBe(false);

		mount(app);
		app.unmount();
		apps.delete(app);
		expect(system.listeners.size).toBe(0);
	});

	test('unset mirrors a .dark class on <html>', async () => {
		stubSystemScheme(false);
		root().classList.add('dark');
		installVue({});
		expect(isDark()).toBe(true);

		root().classList.remove('dark');
		// MutationObserver callbacks run as a microtask.
		await Promise.resolve();
		expect(isDark()).toBe(false);
	});

	test('null leaves the class to the site', () => {
		stubSystemScheme(true);
		root().classList.add('dark');
		installVue({ colorScheme: null });
		expect(isDark()).toBe(false);
	});

	test('sets the class without matchMedia', () => {
		vi.stubGlobal('matchMedia', undefined);
		installVue({ colorScheme: 'dark' });
		expect(isDark()).toBe(true);
	});

	test('adds dark tokens to the token style element', () => {
		stubSystemScheme(false);
		installVue({ theme: { dark: { primary: '#40e0d0' } } });
		expect(document.getElementById('c15t-css-vars')?.textContent).toContain(
			'--c15t-primary: #40e0d0;'
		);
	});

	test('leaves the class to the host that owns a borrowed runtime', () => {
		stubSystemScheme(true);
		const runtime = createConsentRuntime({
			mode: hosted({ url: 'https://consent.example.test' }),
			pkg: '@c15t/vue-test',
		});
		const app = createApp(defineComponent({ setup: () => () => h('main') }));
		app.use(c15tVue, { colorScheme: 'dark', runtime });
		apps.add(app);
		expect(isDark()).toBe(false);
		runtime.dispose();
	});
});

interface NuxtHead {
	script?: { innerHTML: string; key: string; nonce?: string }[];
	style?: { id: string; innerHTML: string; nonce?: string }[];
}

const renderNuxtHead = async (): Promise<NuxtHead> => {
	const app = createSSRApp(defineComponent({ setup: () => () => h('main') }));
	vi.stubGlobal('window', undefined);
	await plugin({ hook: () => undefined, payload: {}, vueApp: app });
	vi.unstubAllGlobals();
	return toValue(nuxt.head[0]) as NuxtHead;
};

describe('the Nuxt plugin applies colorScheme', () => {
	test.each([
		{ colorScheme: 'dark', script: "classList.add('c15t-dark')" },
		{ colorScheme: 'system', script: 'prefers-color-scheme:dark' },
	] as const)(
		'$colorScheme sets the class from a head script in the server HTML',
		async ({ colorScheme, script }) => {
			nuxt.appConfig = { colorScheme, nonce: 'head-nonce' };
			const head = await renderNuxtHead();
			expect(head.script).toEqual([
				expect.objectContaining({
					innerHTML: expect.stringContaining(script),
					nonce: 'head-nonce',
				}),
			]);
		}
	);

	test.each(['light', null, undefined] as const)(
		'%s adds no head script',
		async (colorScheme) => {
			nuxt.appConfig = { colorScheme };
			const head = await renderNuxtHead();
			expect(head.script ?? []).toEqual([]);
		}
	);

	test('renders theme.dark tokens in the server HTML', async () => {
		nuxt.appConfig = {
			colorScheme: 'system',
			theme: { dark: { primary: '#40e0d0' } },
		};
		const head = await renderNuxtHead();
		expect(head.style?.[0]?.innerHTML).toContain('--c15t-primary: #40e0d0;');
	});

	test('applies the class in the browser', async () => {
		stubSystemScheme(false);
		nuxt.appConfig = { colorScheme: 'dark' };
		failingFetch();
		const app = createSSRApp(defineComponent({ setup: () => () => h('main') }));
		await plugin({ hook: () => undefined, payload: {}, vueApp: app });
		expect(isDark()).toBe(true);
	});
});
