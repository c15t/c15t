import { MINIMAL_GVL } from '@c15t/conformance';
import { custom } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import { resolvePolicyRules } from '@c15t/schema/types';
import { mount, tick, unmount } from 'svelte';
import { afterEach, expect, onTestFinished, test, vi } from 'vitest';

import ConformanceFixture from './fixtures/conformance-fixture.svelte';
import { policyFixture } from './policy-fixture';

afterEach(() => {
	localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
		}
	}
});

const settle = (outcome: 'pending' | 'rejected') =>
	outcome === 'pending'
		? Promise.withResolvers<{ ok: boolean }>().promise
		: Promise.reject(new Error('offline'));

const mountFixture = function mountFixture(
	props: Parameters<typeof mount<typeof ConformanceFixture>>[1]['props']
) {
	const target = document.createElement('div');
	document.body.append(target);
	const app = mount(ConformanceFixture, { props, target });
	onTestFinished(async () => {
		await unmount(app);
		target.remove();
	});
};

const buttons = {
	accept: 'consent-widget-footer-accept-all-button',
	reject: 'consent-widget-reject-button',
	save: 'consent-widget-footer-save-button',
} as const;

test.each(
	(['accept', 'reject', 'save'] as const).flatMap((action) =>
		(['pending', 'rejected'] as const).map((outcome) => ({ action, outcome }))
	)
)(
	'the dialog closes on $action before a $outcome save settles',
	async ({ action, outcome }) => {
		let storedAtSave: string | null = null;
		const save = vi.fn(() => {
			storedAtSave = localStorage.getItem('c15t');
			return settle(outcome);
		});
		const onError = vi.fn();
		const onBeforeLoad = vi.fn();
		let kernel: ConsentKernel | undefined;
		mountFixture({
			component: 'consent-dialog',
			onKernel: (value) => {
				kernel = value;
			},
			options: {
				callbacks: { onError },
				disableAnimation: true,
				mode: custom({ save }),
				prefetch: policyFixture({}, { categories: ['marketing'] }),
				scripts: [
					{
						callbackOnly: true,
						category: 'marketing',
						id: 'optimistic-marketing',
						onBeforeLoad,
					},
				],
			},
		});
		await vi.waitFor(() => expect(kernel).toBeDefined());
		const snapshot = () => (kernel as ConsentKernel).getSnapshot();
		kernel?.set.activeUI('dialog');
		const dialog = () =>
			document.querySelector('[data-testid="consent-dialog-root"]');
		await vi.waitFor(() => expect(dialog()).not.toBeNull());
		document
			.querySelector<HTMLButtonElement>(`[data-testid="${buttons[action]}"]`)
			?.click();
		// Closed in the click task, before the request starts.
		expect(snapshot().activeUI).toBe('none');
		expect(save).not.toHaveBeenCalled();
		expect(snapshot().explicitChoice?.categories.marketing?.value).toBe(
			action === 'accept'
		);
		expect(onBeforeLoad).toHaveBeenCalledTimes(action === 'accept' ? 1 : 0);
		await tick();
		expect(dialog()).toBeNull();
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(storedAtSave).toContain('marketing');
		// A failed request reaches the error event once; a pending one never.
		await vi.waitFor(() =>
			expect(onError).toHaveBeenCalledTimes(outcome === 'rejected' ? 1 : 0)
		);
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		await tick();
		expect(snapshot().activeUI).toBe('none');
		expect(dialog()).toBeNull();
		expect(snapshot().explicitChoice?.categories.marketing?.value).toBe(
			action === 'accept'
		);
	}
);

test.each(
	(['iab-consent-banner', 'iab-consent-dialog'] as const).flatMap((component) =>
		(['accept', 'reject'] as const).flatMap((action) =>
			(['pending', 'rejected'] as const).map((outcome) => ({
				action,
				component,
				outcome,
			}))
		)
	)
)(
	'$component closes on $action before a $outcome save settles',
	async ({ action, component, outcome }) => {
		const save = vi.fn(() => settle(outcome));
		let kernel: ConsentKernel | undefined;
		mountFixture({
			component,
			onKernel: (value) => {
				kernel = value;
			},
			options: {
				disableAnimation: true,
				iab: { cmpId: 123, gvl: MINIMAL_GVL as unknown as GlobalVendorList },
				mode: custom({ save }),
				persistence: false,
				prefetch: {
					initialIab: {
						cmpId: 123,
						enabled: true,
						gvl: MINIMAL_GVL as unknown as GlobalVendorList,
					},
					initialPolicyResolution: resolvePolicyRules({
						countryCode: 'DE',
						regionCode: null,
						rules: [
							{
								id: 'iab',
								match: { isDefault: true },
								model: 'iab',
								prompt: 'choice',
							},
						],
					}),
				},
			},
		});
		const surface = component === 'iab-consent-banner' ? 'banner' : 'dialog';
		const button = () =>
			document.querySelector<HTMLButtonElement>(
				surface === 'banner'
					? `[data-testid="iab-consent-banner-${action}-button"]`
					: `[data-testid="iab-consent-dialog-root"] [data-action="${action}"]`
			);
		await vi.waitFor(() => {
			expect(button()).not.toBeNull();
			expect(button()?.disabled).toBe(false);
		});
		const snapshot = () => (kernel as ConsentKernel).getSnapshot();
		kernel?.set.activeUI(surface);
		await tick();
		button()?.click();
		// Closed in the click task, before the TC string or the request.
		expect(snapshot().activeUI).toBe('none');
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(snapshot().iab?.authority?.tcString).toBeTruthy();
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		await tick();
		expect(snapshot().activeUI).toBe('none');
		// The fixture pins the dialog with `open`; the banner follows the kernel.
		expect(
			document.querySelector('[data-testid="iab-consent-banner-card"]')
		).toBeNull();
	}
);
