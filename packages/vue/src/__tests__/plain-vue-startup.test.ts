import { afterEach, expect, test, vi } from 'vitest';
import { createApp, defineComponent, h, inject } from 'vue';

import { c15tVue } from '../index';
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
