import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import type { App, ShallowRef } from 'vue';

const TRACKER = 'https://tracker.example/collect';

const nuxt = vi.hoisted(() => ({
	onRequestBlocked: undefined as ((info: unknown) => void) | undefined,
	state: new Map<string, unknown>(),
}));
// oxlint-disable-next-line anti-slop/no-module-mocking -- Nuxt supplies this virtual module; the test keeps app config and runtime config apart as Nuxt does.
vi.mock('#imports', async () => {
	const { shallowRef: makeRef } = await import('vue');
	return {
		defineNuxtPlugin: (plugin: unknown) => plugin,
		// `app.config.ts` is bundled with the app, so it can hold a function.
		useAppConfig: () => ({
			c15t: {
				networkBlocker: {
					onRequestBlocked: nuxt.onRequestBlocked,
					rules: [{ category: 'measurement', domain: 'tracker.example' }],
				},
			},
		}),
		useFetch: () => Promise.resolve({ data: makeRef(undefined) }),
		useRequestEvent: () => undefined,
		useRequestHeaders: () => ({}),
		// Module options arrive as JSON through the public runtime config.
		useRuntimeConfig: () => ({
			public: {
				c15t: JSON.parse(
					JSON.stringify({
						backendURL: 'https://consent.example.test',
						iframeBlocker: false,
						networkBlocker: { logBlockedRequests: false, rules: [] },
					})
				),
			},
		}),
		useState: (key: string, init: () => unknown) => {
			if (!nuxt.state.has(key)) {
				nuxt.state.set(key, makeRef(init()));
			}
			return nuxt.state.get(key) as ShallowRef<unknown>;
		},
	};
});

type NuxtPlugin = (app: {
	hook: (name: string, callback: () => void) => void;
	payload: { prerenderedAt?: number };
	vueApp: App;
}) => Promise<void>;

let plugin: NuxtPlugin;
// Loading the plugin compiles the core runtime; keep that out of the test.
beforeAll(async () => {
	({ default: plugin } = await vi.importActual<{ default: NuxtPlugin }>(
		'../runtime/plugin.nuxt'
	));
}, 30_000);

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	nuxt.state.clear();
	document.body.replaceChildren();
});

test('onRequestBlocked from app.config reaches the network blocker', async () => {
	const onRequestBlocked = vi.fn();
	nuxt.onRequestBlocked = onRequestBlocked;
	const network = vi.fn((_input: RequestInfo | URL) =>
		Promise.resolve(new Response('{}', { status: 503 }))
	);
	vi.stubGlobal('fetch', network);
	const app = createApp(defineComponent({ setup: () => () => h('main') }));
	let mounted: (() => void) | undefined;
	await plugin({
		hook: (name, lifecycle) => {
			if (name === 'app:mounted') {
				mounted = lifecycle;
			}
		},
		payload: {},
		vueApp: app,
	});
	const container = document.createElement('div');
	document.body.append(container);
	app.mount(container);
	mounted?.();
	try {
		// Init fails, so measurement stays denied.
		const response = await window.fetch(TRACKER);

		expect(response.status).toBe(451);
		expect(
			network.mock.calls.filter(([input]) => String(input) === TRACKER)
		).toHaveLength(0);
		expect(onRequestBlocked).toHaveBeenCalledWith(
			expect.objectContaining({ url: TRACKER })
		);
	} finally {
		app.unmount();
	}
});
