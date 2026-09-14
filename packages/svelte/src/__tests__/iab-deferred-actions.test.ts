import { custom, deferInitGvl } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { mount, unmount } from 'svelte';
import { expect, test, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

test.each(
	(['iab-consent-banner', 'iab-consent-dialog'] as const).flatMap((component) =>
		['accept', 'reject'].map((action) => ({ action, component }))
	)
)(
	'keeps $component open after deferred $action fails and allows retry',
	async ({ component, action }) => {
		let rejectLoad!: (error: Error) => void;
		const fetch = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise<Response>((_resolve, reject) => {
						rejectLoad = reject;
					})
			)
			.mockImplementation(() => Promise.resolve(Response.json(completeGVL)));
		vi.stubGlobal('fetch', fetch);
		const target = document.createElement('div');
		document.body.append(target);
		let kernel: ConsentKernel | undefined;
		const app = mount(ConformanceFixture, {
			props: {
				component,
				onKernel: (value) => {
					kernel = value;
				},
				options: {
					disableAnimation: true,
					iab: { cmpId: 28 },
					mode: custom({}),
					persistence: false,
					prefetch: {
						initialIab: {
							cmpId: 28,
							enabled: true,
							...deferInitGvl({ gvl: completeGVL }, '/vendor-list'),
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
			},
			target,
		});
		try {
			const button = () =>
				document.querySelector<HTMLButtonElement>(
					component === 'iab-consent-banner'
						? `[data-testid="iab-consent-banner-${action}-button"]`
						: `[data-testid="iab-consent-dialog-root"] [data-action="${action}"]`
				);
			await vi.waitFor(() => {
				expect(fetch).toHaveBeenCalledTimes(1);
				expect(button()).not.toBeNull();
				expect(button()?.disabled).toBe(false);
			});
			if (component === 'iab-consent-dialog') {
				kernel?.set.activeUI('dialog');
			}
			button()?.click();
			expect(kernel?.getSnapshot().activeUI).toBe(
				component === 'iab-consent-banner' ? 'banner' : 'dialog'
			);
			rejectLoad(new Error('offline'));
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(kernel?.getSnapshot().activeUI).toBe(
				component === 'iab-consent-banner' ? 'banner' : 'dialog'
			);
			expect(kernel?.getSnapshot().iab?.authority).toBeNull();
			button()?.click();
			await vi.waitFor(() =>
				expect(kernel?.getSnapshot().iab?.authority?.tcString).toBeTruthy()
			);
			expect(kernel?.getSnapshot().activeUI).toBe('none');
			expect(fetch).toHaveBeenCalledTimes(2);
		} finally {
			await unmount(app);
			target.remove();
			vi.unstubAllGlobals();
		}
	}
);

test.each(['iab-consent-banner', 'iab-consent-dialog'] as const)(
	'does not close a reopened dialog when a slow %s save finishes',
	async (component) => {
		let finish!: () => void;
		const save = vi.fn(async () => {
			await new Promise<void>((resolve) => {
				finish = resolve;
			});
			return { ok: true };
		});
		let kernel: ConsentKernel | undefined;
		const target = document.createElement('div');
		document.body.append(target);
		const app = mount(ConformanceFixture, {
			props: {
				component,
				onKernel: (value) => {
					kernel = value;
				},
				options: {
					disableAnimation: true,
					iab: { cmpId: 28, gvl: completeGVL },
					mode: custom({ save }),
					persistence: false,
					prefetch: {
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
			},
			target,
		});
		try {
			const selector =
				component === 'iab-consent-banner'
					? '[data-testid="iab-consent-banner-accept-button"]'
					: '[data-action="accept"]';
			const button = () => document.querySelector<HTMLButtonElement>(selector);
			await vi.waitFor(() => expect(button()).not.toBeNull());
			button()?.click();
			await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
			kernel?.set.activeUI('none');
			kernel?.set.activeUI('dialog');
			finish();
			await new Promise((resolve) => {
				setTimeout(resolve, 0);
			});
			expect(kernel?.getSnapshot().activeUI).toBe('dialog');
		} finally {
			await unmount(app);
			target.remove();
		}
	}
);
