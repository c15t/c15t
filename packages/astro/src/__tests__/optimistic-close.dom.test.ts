/**
 * The dialog island closes when the choice is recorded, not when the backend
 * answers. The island renders the real React surface against the page
 * runtime, as it does on an Astro page with `ui: 'react'`.
 */

import { custom } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';

import type { C15tResolvedOptions } from '../types';
import { registerDialogSurface } from '../ui/adapter';
import type { ConsentDialogHandle } from '../ui/adapter';
import { reactDialogAdapter } from '../ui/react';
import { testResolution } from './policy-fixture';

const OPTIONS = {
	consentCategories: ['necessary', 'marketing', 'measurement'],
	endpoints: { enabled: false, initPath: '/i', manifestPath: '/m' },
	mode: { type: 'offline' },
	ui: 'react',
} as unknown as C15tResolvedOptions;

const cleanup: (() => Promise<void> | void)[] = [];

// jsdom has no `matchMedia`; the React surface reads reduced motion from it.
beforeAll(() => {
	window.matchMedia ??= (query: string) =>
		({
			addEventListener: () => undefined,
			addListener: () => undefined,
			dispatchEvent: () => false,
			matches: false,
			media: query,
			onchange: null,
			removeEventListener: () => undefined,
			removeListener: () => undefined,
		}) as MediaQueryList;
});

afterEach(async () => {
	for (const step of cleanup.splice(0).reverse()) {
		// oxlint-disable-next-line no-await-in-loop -- Tear down in reverse mount order.
		await step();
	}
	localStorage.clear();
});

for (const action of ['accept', 'reject', 'save'] as const) {
	for (const outcome of ['pending', 'rejected'] as const) {
		it(`closes the React island on ${action} before a ${outcome} save settles`, async () => {
			const save = vi.fn(() =>
				outcome === 'pending'
					? Promise.withResolvers<{ ok: boolean }>().promise
					: Promise.reject(new Error('offline'))
			);
			const runtime: ConsentRuntime = createConsentRuntime({
				consentCategories: ['necessary', 'marketing', 'measurement'],
				mode: custom({ save }),
				persistence: false,
				pkg: '@c15t/astro-test',
				prefetch: { initialPolicyResolution: testResolution() },
			});
			cleanup.push(() => runtime.dispose());
			registerDialogSurface(
				'react',
				() => import('../components/islands/panel-surface')
			);
			const target = document.createElement('div');
			document.body.append(target);
			cleanup.push(() => target.remove());
			runtime.kernel.set.activeUI('dialog');
			const handle: ConsentDialogHandle = await reactDialogAdapter.mount({
				kind: 'preferences',
				options: OPTIONS,
				runtime,
				target,
			});
			cleanup.push(() => handle.destroy());
			const button = () =>
				document.querySelector<HTMLButtonElement>(
					`[data-testid="${
						{
							accept: 'consent-widget-footer-accept-all-button',
							reject: 'consent-widget-reject-button',
							save: 'consent-widget-footer-save-button',
						}[action]
					}"]`
				);
			await vi.waitFor(() => expect(button()).not.toBeNull());
			button()?.click();
			// Closed in the click task, before the request starts.
			expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
			expect(save).not.toHaveBeenCalled();
			expect(
				runtime.kernel.getSnapshot().explicitChoice?.categories.marketing?.value
			).toBe(action === 'accept');
			await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
			await new Promise((resolve) => {
				setTimeout(resolve, 20);
			});
			expect(runtime.kernel.getSnapshot().activeUI).toBe('none');
		});
	}
}
