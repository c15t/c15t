import { hosted } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { createApp, createSSRApp, defineComponent, h, toValue } from 'vue';
import type { App } from 'vue';

import { c15tVue, generateTokensCSS } from './test-plugin';

const nuxt = vi.hoisted(() => ({
	head: [] as unknown[],
	state: new Map<string, unknown>(),
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; the test records what the plugin hands to useHead.
vi.mock('#imports', async () => {
	const { shallowRef: makeRef } = await import('vue');
	return {
		defineNuxtPlugin: (plugin: unknown) => plugin,
		useAppConfig: () => ({
			c15t: { nonce: 'style-nonce', tokens: { 'c15t-primary': '#2f6f4e' } },
		}),
		useHead: (input: unknown) => {
			nuxt.head.push(input);
		},
		useRequestEvent: () => undefined,
		useRequestHeaders: () => ({}),
		useRequestURL: () => new URL('https://app.example/'),
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

const tokensStyle = () => document.getElementById('c15t-css-vars');

afterEach(() => {
	vi.unstubAllGlobals();
	nuxt.head.length = 0;
	nuxt.state.clear();
	document.head.replaceChildren();
	document.body.replaceChildren();
});

describe('generateTokensCSS', () => {
	test('writes configured tokens over the defaults', () => {
		const css = generateTokensCSS({ 'c15t-primary': '#2f6f4e' });
		expect(css).toMatch(/^:root,:host\{/u);
		expect(css).toContain('--c15t-primary:#2f6f4e;');
		expect(css).toContain('--c15t-radius-md:0.5rem;');
	});

	test('cannot close the style element', () => {
		expect(
			generateTokensCSS({ 'c15t-primary': 'red</style><script>' })
		).not.toContain('<');
	});
});

describe('the Vue plugin applies tokens', () => {
	test('before the app mounts, with no ConsentRoot', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('{}', { status: 503 })))
		);
		const app = createApp(defineComponent({ setup: () => () => h('main') }));
		app.use(c15tVue, {
			backendURL: 'https://consent.example.test',
			nonce: 'style-nonce',
			tokens: { 'c15t-primary': '#2f6f4e' },
		});

		const style = tokensStyle();
		expect(style?.textContent).toContain('--c15t-primary:#2f6f4e;');
		expect(style?.getAttribute('nonce')).toBe('style-nonce');

		const container = document.createElement('div');
		document.body.append(container);
		app.mount(container);
		app.unmount();

		expect(tokensStyle()).toBeNull();
	});

	test('keeps the element until the last app that uses it unmounts', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('{}', { status: 503 })))
		);
		const mountApp = () => {
			const app = createApp(defineComponent({ setup: () => () => h('main') }));
			app.use(c15tVue, {
				backendURL: 'https://consent.example.test',
				tokens: { 'c15t-primary': '#2f6f4e' },
			});
			const container = document.createElement('div');
			document.body.append(container);
			app.mount(container);
			return app;
		};
		const first = mountApp();
		const second = mountApp();
		expect(document.querySelectorAll('#c15t-css-vars')).toHaveLength(1);

		first.unmount();
		expect(tokensStyle()?.textContent).toContain('--c15t-primary:#2f6f4e;');

		second.unmount();
		expect(tokensStyle()).toBeNull();
	});

	test('leaves a server-rendered element in place on unmount', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => Promise.resolve(new Response('{}', { status: 503 })))
		);
		const serverStyle = document.createElement('style');
		serverStyle.id = 'c15t-css-vars';
		document.head.append(serverStyle);
		const app = createApp(defineComponent({ setup: () => () => h('main') }));
		app.use(c15tVue, {
			backendURL: 'https://consent.example.test',
			tokens: { 'c15t-primary': '#2f6f4e' },
		});
		const container = document.createElement('div');
		document.body.append(container);
		app.mount(container);
		app.unmount();

		expect(tokensStyle()).toBe(serverStyle);
	});

	test('leaves styling to the host that owns a borrowed runtime', () => {
		const runtime = createConsentRuntime({
			mode: hosted({ backendURL: 'https://consent.example.test' }),
			pkg: '@c15t/vue-test',
		});
		const app = createApp(defineComponent({ setup: () => () => h('main') }));
		app.use(c15tVue, { runtime });

		expect(tokensStyle()).toBeNull();
		runtime.dispose();
	});
});

describe('the Nuxt plugin applies tokens', () => {
	test('through useHead while rendering on the server', async () => {
		const app = createSSRApp(defineComponent({ setup: () => () => h('main') }));
		vi.stubGlobal('window', undefined);
		await plugin({
			hook: () => undefined,
			payload: {},
			vueApp: app,
		});
		vi.unstubAllGlobals();

		const head = toValue(nuxt.head[0]) as {
			style?: { id: string; innerHTML: string; nonce?: string }[];
		};
		expect(head.style).toEqual([
			expect.objectContaining({
				id: 'c15t-css-vars',
				innerHTML: expect.stringContaining('--c15t-primary:#2f6f4e;'),
				nonce: 'style-nonce',
			}),
		]);
	});
});
