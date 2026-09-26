import { afterEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';

import { c15tVue } from '../index';
import type { C15tVuePluginOptions } from '../index';

const TRACKER = 'https://tracker.example/collect';

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) {
		cleanup();
	}
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

const mountWith = (options: C15tVuePluginOptions) => {
	const network = vi.fn((_input: RequestInfo | URL) =>
		Promise.resolve(new Response('{}', { status: 503 }))
	);
	vi.stubGlobal('fetch', network);
	const container = document.createElement('div');
	document.body.append(container);
	const app = createApp(
		defineComponent({ setup: () => () => h('main', 'App') })
	);
	app.use(c15tVue, options);
	app.mount(container);
	cleanups.push(() => {
		app.unmount();
		container.remove();
	});
	const trackerCalls = () =>
		network.mock.calls.filter(([input]) => String(input).startsWith(TRACKER));
	return { trackerCalls };
};

test('the plugin blocks requests matching its networkBlocker rules', async () => {
	const onRequestBlocked = vi.fn();
	const { trackerCalls } = mountWith({
		backendURL: 'https://consent.example.test',
		networkBlocker: {
			logBlockedRequests: false,
			onRequestBlocked,
			rules: [{ category: 'measurement', domain: 'tracker.example' }],
		},
	});

	// The init request fails, so optional categories stay denied.
	const response = await window.fetch(TRACKER);

	expect(response.status).toBe(451);
	expect(trackerCalls()).toHaveLength(0);
	expect(onRequestBlocked).toHaveBeenCalledWith(
		expect.objectContaining({ url: TRACKER })
	);
});

test('networkBlocker: false leaves fetch alone', async () => {
	const { trackerCalls } = mountWith({
		backendURL: 'https://consent.example.test',
		networkBlocker: false,
	});

	expect((await window.fetch(TRACKER)).status).toBe(503);
	expect(trackerCalls()).toHaveLength(1);
});
