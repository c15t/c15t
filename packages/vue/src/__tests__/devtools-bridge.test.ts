import { createConsentKernel } from '@c15t/core';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { registerDevToolsBridge } from '../runtime/devtools/bridge';
import { DEVTOOLS_BRIDGE_KEY } from '../runtime/devtools/constants';
import { renderDevToolsPage } from '../runtime/devtools/page';

const cleanups: (() => void)[] = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0).reverse()) {
		cleanup();
	}
	document.documentElement.className = '';
	document.body.replaceChildren();
});

/** A same-origin iframe loaded with the tab page's markup, scripts not run. */
const createTabFrame = (): Window => {
	const frame = document.createElement('iframe');
	document.body.append(frame);
	const view = frame.contentWindow;
	if (!view) {
		throw new Error('jsdom did not create the iframe window');
	}
	view.document.documentElement.innerHTML = renderDevToolsPage().replace(
		/^<!doctype html>\s*<html lang="en">|<\/html>$/gu,
		''
	);
	return view;
};

/** Run the page's inline script against the iframe's globals. */
const runTabScript = (view: Window): void => {
	const source = view.document.querySelector('script')?.textContent;
	if (!source) {
		throw new Error('The DevTools page has no inline script');
	}
	const timers: ReturnType<typeof setInterval>[] = [];
	// oxlint-disable-next-line no-new-func -- Runs the page's shipped inline script with the iframe's globals.
	new Function(
		'window',
		'document',
		'addEventListener',
		'setInterval',
		'MutationObserver',
		source
	)(
		view,
		view.document,
		view.addEventListener.bind(view),
		(callback: () => void, delay: number) => {
			const timer = setInterval(callback, delay);
			timers.push(timer);
			return timer;
		},
		MutationObserver
	);
	cleanups.push(() => {
		for (const timer of timers) {
			clearInterval(timer);
		}
		view.dispatchEvent(new Event('pagehide'));
	});
};

const panelRoot = (view: Window): HTMLElement | null =>
	view.document
		.querySelector('[data-c15t-dev-tools-host]')
		?.shadowRoot?.querySelector<HTMLElement>('[data-c15t-dev-tools]') ?? null;

describe('Nuxt DevTools tab bridge', () => {
	test('mounts an embedded panel for the app kernel into the tab page', async () => {
		const kernel = createConsentKernel();
		cleanups.push(() => kernel.dispose());
		document.documentElement.classList.add('dark');
		const view = createTabFrame();
		runTabScript(view);
		expect(view.document.getElementById('c15t-devtools-waiting')?.hidden).toBe(
			false
		);

		// The page looks through `parent`, jsdom's window, not Vitest's global.
		cleanups.push(registerDevToolsBridge(view.parent, { kernel }));
		await vi.waitFor(() => expect(panelRoot(view)).not.toBeNull(), {
			timeout: 2000,
		});
		const root = panelRoot(view);
		expect(root?.classList).toContain('c15t-dev-tools--embedded');
		expect(root?.style.colorScheme).toBe('dark');
		expect(view.document.getElementById('c15t-devtools-waiting')?.hidden).toBe(
			true
		);

		document.documentElement.classList.replace('dark', 'light');
		await vi.waitFor(() => expect(root?.style.colorScheme).toBe('light'));

		root?.querySelector<HTMLButtonElement>('[data-tab="events"]')?.click();
		await kernel.commands.save({ measurement: true });
		expect(panelRoot(view)?.textContent).toContain('choice:recorded');
	});

	test('removes the bridge and every panel it mounted', () => {
		const kernel = createConsentKernel();
		cleanups.push(() => kernel.dispose());
		const unregister = registerDevToolsBridge(window, { kernel });
		const bridge = (window as unknown as Record<string, unknown>)[
			DEVTOOLS_BRIDGE_KEY
		] as { mount: (container: HTMLElement) => { element: HTMLElement | null } };
		const container = document.createElement('div');
		document.body.append(container);
		bridge.mount(container);
		expect(container.childElementCount).toBe(1);

		unregister();
		expect(DEVTOOLS_BRIDGE_KEY in window).toBe(false);
		expect(container.childElementCount).toBe(0);
	});

	test('releases panels whose tab iframe was removed without cleanup', () => {
		const kernel = createConsentKernel();
		cleanups.push(() => kernel.dispose());
		const released = vi.fn();
		const subscribe = kernel.subscribe.bind(kernel);
		vi.spyOn(kernel, 'subscribe').mockImplementation((listener) => {
			const unsubscribe = subscribe(listener);
			return () => {
				released();
				unsubscribe();
			};
		});
		cleanups.push(registerDevToolsBridge(window, { kernel }));
		const bridge = (window as unknown as Record<string, unknown>)[
			DEVTOOLS_BRIDGE_KEY
		] as { mount: (container: HTMLElement) => unknown };
		const frame = document.createElement('iframe');
		document.body.append(frame);
		const stale = frame.contentDocument?.body;
		if (!stale) {
			throw new Error('jsdom did not create the iframe document');
		}
		bridge.mount(stale);
		frame.remove();
		expect(released).not.toHaveBeenCalled();

		const container = document.createElement('div');
		document.body.append(container);
		bridge.mount(container);
		expect(released).toHaveBeenCalled();
		expect(container.childElementCount).toBe(1);
	});
});
