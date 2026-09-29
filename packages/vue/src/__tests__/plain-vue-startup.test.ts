import { holdNetworkRequests } from '@c15t/core/modules/network-hold';
import { afterEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, inject, onMounted } from 'vue';

import { c15tVue } from '../index';
import {
	createVueConsentKernelContext,
	startVueConsentRuntime,
} from '../runtime/kernel';
import type { RuntimeConsentConfig } from '../runtime/kernel';
import { symbolKernel } from '../runtime/utils/symbols';

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
	vi.unstubAllGlobals();
});

test.each([false, true])(
	'starts once and cleans up with an exposed root: %s',
	async (exposeRoot) => {
		const fetch = vi.fn(() =>
			Promise.resolve(new Response('{}', { status: 503 }))
		);
		vi.stubGlobal('fetch', fetch);
		const lifecycle = { dispose: vi.fn(), init: vi.fn() };
		const child = defineComponent({
			setup() {
				return () => h('p', 'Nested component');
			},
		});
		const root = defineComponent({
			setup(_props, { expose }) {
				// The compiler calls expose() for a closed <script setup> component.
				if (exposeRoot) {
					expose();
				}
				const kernel = inject(symbolKernel);
				if (!kernel) {
					throw new Error('Missing consent kernel');
				}
				const { init } = kernel.commands;
				vi.spyOn(kernel.commands, 'init').mockImplementation((...args) => {
					lifecycle.init();
					return init(...args);
				});
				const { dispose } = kernel;
				vi.spyOn(kernel, 'dispose').mockImplementation(() => {
					lifecycle.dispose();
					dispose();
				});
				return () => h('main', [h(child), h(child)]);
			},
		});
		const container = document.createElement('div');
		document.body.append(container);
		const app = createApp(root);
		app.use(c15tVue, { backendURL: 'https://consent.example.test' });
		let mounted = false;
		cleanups.push(() => {
			if (mounted) {
				app.unmount();
			}
			container.remove();
		});
		app.mount(container);
		mounted = true;
		expect(lifecycle.init).toHaveBeenCalledTimes(1);
		await expect.poll(() => fetch.mock.calls.length).toBe(1);
		expect(lifecycle.dispose).not.toHaveBeenCalled();
		app.unmount();
		mounted = false;
		expect(lifecycle.dispose).toHaveBeenCalledTimes(1);
	}
);

test('holds tracker requests from child mount hooks until the blocker decides them', async () => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	const network = vi.fn((_input: RequestInfo | URL) =>
		Promise.resolve(new Response('{}', { status: 503 }))
	);
	vi.stubGlobal('fetch', network);
	const statuses: Promise<number>[] = [];
	// Children mount before the root, and the root's mount installs the blocker.
	const child = defineComponent({
		setup() {
			onMounted(() => {
				statuses.push(
					window
						.fetch('https://tracker.example/collect')
						.then(({ status }) => status)
				);
			});
			return () => h('p', 'Tracker');
		},
	});
	const container = document.createElement('div');
	document.body.append(container);
	const app = createApp(
		defineComponent({ setup: () => () => h('main', [h(child)]) })
	);
	const config: RuntimeConsentConfig = {
		backendURL: 'https://consent.example.test',
		networkBlocker: {
			logBlockedRequests: false,
			rules: [{ category: 'measurement', domain: 'tracker.example' }],
		},
	};
	app.use(c15tVue, config);
	cleanups.push(() => {
		app.unmount();
		container.remove();
	});
	app.mount(container);

	expect(await Promise.all(statuses)).toEqual([451]);
	expect(
		network.mock.calls.some(([input]) =>
			String(input).includes('tracker.example')
		)
	).toBe(false);
});

const tick = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

const settles = (request: Promise<Response>) => {
	const state = { settled: false };
	void request.finally(() => {
		state.settled = true;
	});
	return state;
};

test('a context disposed before startup fails only its own held requests closed', async () => {
	const network = vi.fn((_input: RequestInfo | URL) =>
		Promise.resolve(new Response('{}', { status: 200 }))
	);
	vi.stubGlobal('fetch', network);
	// Another caller holds its own rules.
	const other = holdNetworkRequests([
		{ category: 'marketing', domain: 'ads.example' },
	]);
	cleanups.push(() => other.release()());
	const context = createVueConsentKernelContext({
		config: {
			backendURL: 'https://consent.example.test',
			networkBlocker: {
				rules: [{ category: 'measurement', domain: 'tracker.example' }],
			},
		},
	});
	const own = window.fetch('https://tracker.example/collect');
	const ads = settles(window.fetch('https://ads.example/pixel'));
	await tick();

	// A failed root mount: the context goes away before startup runs.
	context.dispose();

	// Nothing checked consent for it: answered as blocked, not sent.
	expect((await own).status).toBe(451);
	await tick();
	expect(ads.settled).toBe(false);
	expect(network).not.toHaveBeenCalled();
});

test('a disabled Vue blocker leaves other callers holding', async () => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
	const network = vi.fn((_input: RequestInfo | URL) =>
		Promise.resolve(new Response('{}', { status: 503 }))
	);
	vi.stubGlobal('fetch', network);
	const other = holdNetworkRequests([
		{ category: 'marketing', domain: 'ads.example' },
	]);
	cleanups.push(() => other.release()());
	const config: RuntimeConsentConfig = {
		backendURL: 'https://consent.example.test',
		networkBlocker: {
			enabled: false,
			rules: [{ category: 'marketing', domain: 'ads.example' }],
		},
	};
	const context = createVueConsentKernelContext({ config });
	const ads = settles(window.fetch('https://ads.example/pixel'));
	await tick();

	const stop = startVueConsentRuntime(context, config, { runInit: false });
	cleanups.push(stop);
	await tick();

	// The disabled blocker's pass-through would send it unchecked.
	expect(ads.settled).toBe(false);
	expect(
		network.mock.calls.some(([input]) => String(input).includes('ads.example'))
	).toBe(false);
});

test('a context disposed before the blocker loads fails its held requests closed', async () => {
	const network = vi.fn((_input: RequestInfo | URL) =>
		Promise.resolve(new Response('{}', { status: 200 }))
	);
	vi.stubGlobal('fetch', network);
	const context = createVueConsentKernelContext({
		config: {
			backendURL: 'https://consent.example.test',
			networkBlocker: {
				rules: [{ category: 'measurement', domain: 'tracker.example' }],
			},
		},
	});
	let settled = false;
	const early = window.fetch('https://tracker.example/collect').finally(() => {
		settled = true;
	});
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
	expect(settled).toBe(false);

	// A failed root mount: the context goes away before startup runs.
	context.dispose();

	// Nothing checked consent for it: answered as blocked, not sent or hung.
	expect((await early).status).toBe(451);
	expect(
		network.mock.calls.some(([input]) =>
			String(input).includes('tracker.example')
		)
	).toBe(false);
	expect(window.fetch).toBe(network);
});

test('a manifestURL alone resolves the manifest in the browser, with no init route', async () => {
	const requests: string[] = [];
	const network = vi.fn((input: RequestInfo | URL) => {
		requests.push(String(input));
		return Promise.resolve(new Response('{}', { status: 503 }));
	});
	vi.stubGlobal('fetch', network);
	const container = document.createElement('div');
	document.body.append(container);
	const app = createApp(defineComponent({ setup: () => () => h('main') }));
	// Plain Vue has no Nuxt server, so there is no `/api/c15t/init` to call.
	app.use(c15tVue, { manifestURL: 'https://cdn.example.test/manifest' });
	cleanups.push(() => {
		app.unmount();
		container.remove();
	});
	app.mount(container);

	await expect
		.poll(() => requests)
		.toContain('https://cdn.example.test/manifest');
	expect(requests.some((url) => url.includes('/init'))).toBe(false);
});
