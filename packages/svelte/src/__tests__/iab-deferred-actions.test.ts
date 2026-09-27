import { createConsentKernel, custom, deferInitGvl } from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import { mount, unmount } from 'svelte';
import { expect, onTestFinished, test, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { saveIABChoice } from '../lib/context.svelte';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

test.each(
	(['iab-consent-banner', 'iab-consent-dialog'] as const).flatMap((component) =>
		['accept', 'reject'].map((action) => ({ action, component }))
	)
)(
	'restores $component after deferred $action fails and allows retry',
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
		onTestFinished(() => {
			vi.unstubAllGlobals();
		});
		vi.stubGlobal('fetch', fetch);
		const target = document.createElement('div');
		onTestFinished(() => target.remove());
		document.body.append(target);
		let kernel: ConsentKernel | undefined;
		const mounted: { app?: ReturnType<typeof mount> } = {};
		onTestFinished(async () => {
			if (mounted.app) {
				await unmount(mounted.app);
			}
		});
		mounted.app = mount(ConformanceFixture, {
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
		// The surface closes on the click and comes back because the vendor
		// list failed before anything was recorded.
		expect(kernel?.getSnapshot().activeUI).toBe('none');
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
		onTestFinished(() => target.remove());
		document.body.append(target);
		const mounted: { app?: ReturnType<typeof mount> } = {};
		onTestFinished(async () => {
			if (mounted.app) {
				await unmount(mounted.app);
			}
		});
		mounted.app = mount(ConformanceFixture, {
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
	}
);

test('a superseded IAB save does not reopen the surface a newer save closed', async () => {
	const kernel = createConsentKernel();
	onTestFinished(() => kernel.dispose());
	kernel.set.activeUI('banner');
	const first = Promise.withResolvers<undefined>();
	const firstSave = saveIABChoice(kernel, () => first.promise);
	expect(kernel.getSnapshot().activeUI).toBe('none');

	// The visitor reopens the banner and saves again before the first
	// choice is encoded.
	kernel.set.activeUI('banner');
	const second = Promise.withResolvers<undefined>();
	const secondSave = saveIABChoice(kernel, () => second.promise);

	// The newer save invalidates the first, which records nothing.
	first.resolve(undefined);
	await firstSave;
	expect(kernel.getSnapshot().activeUI).toBe('none');

	// The newer save still gets the surface back if it records nothing.
	second.resolve(undefined);
	await secondSave;
	expect(kernel.getSnapshot().activeUI).toBe('banner');
});

test('closing a reopened IAB dialog supersedes a pending deferred save', async () => {
	let rejectLoad!: (error: Error) => void;
	const fetch = vi.fn(
		() =>
			new Promise<Response>((_resolve, reject) => {
				rejectLoad = reject;
			})
	);
	onTestFinished(() => {
		vi.unstubAllGlobals();
	});
	vi.stubGlobal('fetch', fetch);
	const target = document.createElement('div');
	onTestFinished(() => target.remove());
	document.body.append(target);
	let kernel: ConsentKernel | undefined;
	const mounted: { app?: ReturnType<typeof mount> } = {};
	onTestFinished(async () => {
		if (mounted.app) {
			await unmount(mounted.app);
		}
	});
	mounted.app = mount(ConformanceFixture, {
		props: {
			component: 'iab-consent-dialog',
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
	const query = (selector: string) =>
		document.querySelector<HTMLButtonElement>(selector);
	const accept = () =>
		query('[data-testid="iab-consent-dialog-root"] [data-action="accept"]');
	await vi.waitFor(() => {
		expect(fetch).toHaveBeenCalledTimes(1);
		expect(accept()?.disabled).toBe(false);
	});
	kernel?.set.activeUI('dialog');
	accept()?.click();
	expect(kernel?.getSnapshot().activeUI).toBe('none');
	// The visitor reopens the dialog and closes it while the vendor list
	// is still loading.
	kernel?.set.activeUI('dialog');
	await vi.waitFor(() =>
		expect(query('[data-testid="iab-consent-dialog-close"]')).not.toBeNull()
	);
	query('[data-testid="iab-consent-dialog-close"]')?.click();
	expect(kernel?.getSnapshot().activeUI).toBe('none');
	rejectLoad(new Error('offline'));
	await new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
	expect(kernel?.getSnapshot().activeUI).toBe('none');
});
