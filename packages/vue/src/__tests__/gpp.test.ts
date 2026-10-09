/**
 * The `gpp` option mounts the IAB GPP CMP API (`window.__gpp`) from
 * `@c15t/iab/gpp` when the app mounts, and removes it on unmount.
 */
import { offline } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';

import { c15tVue } from './test-plugin';
import type { C15tVuePluginOptions } from './test-plugin';

type GPPWindow = Window & {
	__gpp?: (command: string, callback: (data: unknown) => void) => void;
};

const gppWindow = window as GPPWindow;

const ping = (): { cmpStatus?: string } | undefined => {
	let data: { cmpStatus?: string } | undefined;
	gppWindow.__gpp?.('ping', (result) => {
		data = result as { cmpStatus?: string };
	});
	return data;
};

/** Let the lazy GPP import and any mount it triggers run. */
const flush = () =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});

const cleanups: (() => void)[] = [];

beforeAll(async () => {
	// Load the chunk once so negative cases can't pass on a slow import.
	await import('@c15t/iab/gpp');
}, 30_000);

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
	delete gppWindow.__gpp;
	vi.unstubAllGlobals();
});

const mountApp = function mountApp(options: C15tVuePluginOptions) {
	vi.stubGlobal(
		'fetch',
		vi.fn(() => Promise.resolve(new Response('{}', { status: 503 })))
	);
	const container = document.createElement('div');
	document.body.append(container);
	const app = createApp(defineComponent({ setup: () => () => h('main') }));
	app.use(c15tVue, options);
	let mounted = true;
	app.mount(container);
	const unmount = () => {
		if (mounted) {
			mounted = false;
			app.unmount();
		}
		container.remove();
	};
	cleanups.push(unmount);
	return { unmount };
};

test('gpp installs __gpp after the app mounts and removes it on unmount', async () => {
	const { unmount } = mountApp({
		backendURL: 'https://consent.example.test',
		gpp: true,
	});

	await vi.waitFor(() => expect(ping()).toMatchObject({ cmpStatus: 'loaded' }));

	unmount();
	expect(gppWindow.__gpp).toBeUndefined();
});

test('gpp options reach createGPP', async () => {
	const onError = vi.fn();
	mountApp({
		backendURL: 'https://consent.example.test',
		callbacks: { onError },
		// Neither 1 nor a registered CMP ID, so createGPP rejects it.
		gpp: { cmpId: 0 },
	});

	await vi.waitFor(() =>
		expect(onError).toHaveBeenCalledWith({
			error: expect.stringContaining('cmpId'),
		})
	);
	expect(gppWindow.__gpp).toBeUndefined();
});

test('without gpp the plugin installs no __gpp', async () => {
	mountApp({ backendURL: 'https://consent.example.test' });
	await flush();
	expect(gppWindow.__gpp).toBeUndefined();
});

test('a borrowed runtime keeps GPP to itself', async () => {
	const runtime = createConsentRuntime({
		mode: offline(),
		persistence: false,
	});
	runtime.start();
	cleanups.push(() => runtime.dispose());

	mountApp({ gpp: true, runtime });
	await flush();
	expect(gppWindow.__gpp).toBeUndefined();
});
