/**
 * Mount/close/destroy for each shipped dialog adapter.
 *
 * The surfaces themselves are stubbed through `registerDialogSurface`: what
 * matters here is the seam — that each adapter mounts into the host element,
 * renders the requested dialog kind against the page runtime, closes through
 * the kernel rather than the DOM, and leaves nothing behind on destroy.
 */

import { setTimeout as delay } from 'node:timers/promises';

import { hosted } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { afterEach, describe, expect, it } from 'vitest';

import type { C15tResolvedOptions } from '../types';
import { registerDialogSurface } from '../ui/adapter';
import type { ConsentDialogKind } from '../ui/adapter';
import { reactDialogAdapter } from '../ui/react';
import { vueDialogAdapter } from '../ui/vue';

const OPTIONS = {
	consentCategories: ['necessary', 'marketing'],
	endpoints: { enabled: false, initPath: '/i', manifestPath: '/m' },
	mode: { type: 'hosted', url: 'https://consent.example.test' },
	ui: 'react',
} as unknown as C15tResolvedOptions;

const runtimes: ConsentRuntime[] = [];
const hosts: HTMLElement[] = [];

const createRuntime = function createRuntime(): ConsentRuntime {
	const runtime = createConsentRuntime({
		mode: hosted({ url: 'https://consent.example.test' }),
		pkg: '@c15t/astro-test',
	});
	runtimes.push(runtime);
	return runtime;
};

/** A stub surface: the seam is under test, not the dialog markup. */
const renderNothing = function renderNothing(): null {
	return null;
};

const reactSurface = { default: renderNothing };
const vueSurface = { default: { setup: () => renderNothing } };

const createHost = function createHost(): HTMLElement {
	const host = document.createElement('div');
	document.body.appendChild(host);
	hosts.push(host);
	return host;
};

afterEach(() => {
	for (const runtime of runtimes.splice(0)) {
		runtime.dispose();
	}
	for (const host of hosts.splice(0)) {
		host.remove();
	}
});

describe('the react dialog adapter', () => {
	it('mounts the registered surface with the page runtime', async () => {
		let seen: { runtime?: unknown; kind?: ConsentDialogKind } = {};
		const recordProps = function recordProps(props: {
			runtime: unknown;
			kind: ConsentDialogKind;
		}): null {
			seen = props;
			return null;
		};
		registerDialogSurface('react', () =>
			Promise.resolve({ default: recordProps })
		);
		const runtime = createRuntime();

		const handle = await reactDialogAdapter.mount({
			kind: 'iab',
			options: OPTIONS,
			runtime,
			target: createHost(),
		});
		// React 19 renders concurrently; one macrotask is enough in jsdom.
		await delay(0);

		expect(seen.runtime).toBe(runtime);
		expect(seen.kind).toBe('iab');
		await handle.destroy();
	});

	it('closes through the kernel rather than the DOM', async () => {
		registerDialogSurface('react', () => Promise.resolve(reactSurface));
		const runtime = createRuntime();
		runtime.kernel.set.activeUI('dialog');

		const handle = await reactDialogAdapter.mount({
			kind: 'preferences',
			options: OPTIONS,
			runtime,
			target: createHost(),
		});
		handle.close();

		expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
		await handle.destroy();
	});

	it('warms its chunks without mounting anything', async () => {
		const host = createHost();
		registerDialogSurface('react', () => Promise.resolve(reactSurface));
		await reactDialogAdapter.preload?.();
		expect(host.innerHTML).toBe('');
	});
});

describe('the vue dialog adapter', () => {
	it('mounts the registered surface with the page runtime', async () => {
		let seen: { kind?: ConsentDialogKind } = {};
		registerDialogSurface('vue', () =>
			Promise.resolve({
				default: {
					props: ['kind'],
					setup(props: { kind: ConsentDialogKind }) {
						seen = props;
						return renderNothing;
					},
				},
			})
		);
		const runtime = createRuntime();

		const handle = await vueDialogAdapter.mount({
			kind: 'iab',
			options: OPTIONS,
			runtime,
			target: createHost(),
		});

		expect(seen.kind).toBe('iab');
		await handle.destroy();
		// The plugin borrows the runtime, so unmounting must not kill it.
		expect(runtime.kernel.getSnapshot()).toBeTruthy();
	});

	it('closes through the kernel rather than the DOM', async () => {
		registerDialogSurface('vue', () => Promise.resolve(vueSurface));
		const runtime = createRuntime();
		runtime.kernel.set.activeUI('dialog');

		const handle = await vueDialogAdapter.mount({
			kind: 'preferences',
			options: OPTIONS,
			runtime,
			target: createHost(),
		});
		handle.close();

		expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
		await handle.destroy();
	});

	it('warms its chunks without mounting anything', async () => {
		const host = createHost();
		registerDialogSurface('vue', () => Promise.resolve(vueSurface));
		await vueDialogAdapter.preload?.();
		expect(host.innerHTML).toBe('');
	});
});
