import { MINIMAL_GVL } from '@c15t/conformance';
import {
	custom,
	deferInitGvl,
	createConsentKernel,
	resolveIABBannerSummary,
} from '@c15t/core';
import type { ConsentKernel } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import { useContext, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import { useHeadlessIABConsentUI } from '../component-hooks/use-headless-iab-consent-ui';
import { IABConsentDialog } from '../components/iab-panel';
import { IABConsentBanner } from '../components/iab-prompt';
import { KernelContext } from '../context';
import { IABProvider, useIAB } from '../iab-context';
import { ComponentFixtureProvider } from './component-fixture-provider';
import type { ComponentFixtureOptions } from './component-fixture-provider';
import { policyFixture } from './policy-fixture';

const options = (blocking: boolean): ComponentFixtureOptions => ({
	disableAnimation: true,
	iab: { cmpId: 123, gvl: MINIMAL_GVL as unknown as GlobalVendorList },
	mode: custom({}),
	persistence: false,
	prefetch: policyFixture({}, { model: 'iab' }),
	presentation: { preferences: { blocking }, prompt: { blocking } },
});

const card = (surface: string) =>
	document.querySelector<HTMLElement>(
		`[data-testid="iab-consent-${surface}-card"]`
	);

describe('IAB policy presentation', () => {
	it.each([false, true])(
		'applies blocking=%s to the stock banner despite opposite legacy props',
		async (blocking) => {
			await render(
				<ComponentFixtureProvider options={options(blocking)}>
					<IABConsentBanner
						scrollLock={!blocking}
						trapFocus={!blocking}
					/>
				</ComponentFixtureProvider>
			);
			await vi.waitFor(() => expect(card('banner')).not.toBeNull());
			expect(card('banner')?.getAttribute('aria-modal')).toBe(
				blocking ? 'true' : null
			);
			/* oxlint-disable vitest/no-conditional-expect -- Only the blocking presentation fixture promises to move focus. */
			if (blocking) {
				await vi.waitFor(() =>
					expect(card('banner')?.contains(document.activeElement)).toBe(true)
				);
			}
			/* oxlint-enable vitest/no-conditional-expect */
			expect(
				Boolean(
					document.querySelector('[data-testid="iab-consent-banner-overlay"]')
				)
			).toBe(blocking);
			await vi.waitFor(() =>
				expect(document.body.style.overflow === 'hidden').toBe(blocking)
			);
		}
	);
	it.each(
		[false, true].flatMap((blocking) =>
			[false, true].map((compound) => ({ blocking, compound }))
		)
	)(
		'applies blocking=$blocking to dialogs, compound=$compound',
		async ({ blocking, compound }) => {
			const screen = await render(
				<ComponentFixtureProvider options={options(blocking)}>
					{compound ? (
						<IABConsentDialog.Root
							open
							scrollLock={!blocking}
							trapFocus={!blocking}
						>
							<IABConsentDialog.Card>
								<button type="button">Inside</button>
							</IABConsentDialog.Card>
						</IABConsentDialog.Root>
					) : (
						<IABConsentDialog
							open
							scrollLock={!blocking}
							trapFocus={!blocking}
						/>
					)}
				</ComponentFixtureProvider>
			);
			await vi.waitFor(() => expect(card('dialog')).not.toBeNull());
			expect(card('dialog')?.getAttribute('aria-modal')).toBe(
				blocking ? 'true' : null
			);
			expect(
				Boolean(
					document.querySelector('[data-testid="iab-consent-dialog-overlay"]')
				)
			).toBe(blocking);
			await vi.waitFor(() =>
				expect(document.body.style.overflow === 'hidden').toBe(blocking)
			);
			/* oxlint-disable vitest/no-conditional-expect -- Only the blocking presentation fixture promises to move focus. */
			if (blocking) {
				await vi.waitFor(() =>
					expect(card('dialog')?.contains(document.activeElement)).toBe(true)
				);
			}
			/* oxlint-enable vitest/no-conditional-expect */
			await screen.unmount();
		}
	);
	it.each([false, true])(
		'hides controlled IAB dialogs without a matched policy, compound=%s',
		async (compound) => {
			const value = options(true);
			value.prefetch = {
				initialPolicyResolution: {
					policy: null,
					reason: 'transport',
					status: 'failed',
				},
			};
			const screen = await render(
				<ComponentFixtureProvider options={value}>
					{compound ? (
						<IABConsentDialog.Root
							open
							models={['opt-in', 'iab']}
						>
							<IABConsentDialog.Card>
								<button type="button">Inside</button>
							</IABConsentDialog.Card>
						</IABConsentDialog.Root>
					) : (
						<IABConsentDialog
							open
							models={['opt-in', 'iab']}
						/>
					)}
					<span>Provider mounted</span>
				</ComponentFixtureProvider>
			);
			await expect.element(screen.getByText('Provider mounted')).toBeVisible();
			expect(
				document.querySelector('[data-testid="iab-consent-dialog-root"]')
			).toBeNull();
			expect(document.body.style.overflow).not.toBe('hidden');
		}
	);
});

const SummaryProbe = () => {
	const summary = resolveIABBannerSummary(useIAB());
	return <output>{summary.isReady ? summary.vendorCount : 'pending'}</output>;
};

it.each([false, true])(
	'SSR honors client vendor configuration (filtered=%s)',
	(filtered) => {
		const kernel = createConsentKernel({
			initialIab: {
				cmpId: 28,
				enabled: true,
				gvl: null,
				gvlReference: {
					language: 'en',
					summary: { items: ['Storage'], vendorCount: 100 },
					url: '/vendor-list',
					vendorListVersion: 42,
				},
			},
		});
		try {
			const html = renderToString(
				<KernelContext.Provider value={kernel}>
					<IABProvider
						cmpId={28}
						vendors={filtered ? [1] : undefined}
						customVendors={[
							{
								id: 'publisher',
								name: 'Publisher',
								privacyPolicyUrl: 'https://example.com/privacy',
								purposes: [1],
							},
						]}
					>
						<SummaryProbe />
					</IABProvider>
				</KernelContext.Provider>
			);
			expect(html).toContain(filtered ? 'pending' : '101');
			expect(
				kernel.getServerSnapshot().iab?.gvlReference?.summary?.vendorCount
			).toBe(100);
		} finally {
			kernel.dispose();
		}
	}
);

it.each(
	(['banner', 'dialog', 'compound'] as const).flatMap((surface) =>
		['accept', 'reject'].map((action) => ({ action, surface }))
	)
)(
	'keeps the React IAB $surface available after a failed deferred $action',
	async ({ action, surface }) => {
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
		vi.stubGlobal('__c15t_mock_gvl', undefined);
		const mounted: { screen?: Awaited<ReturnType<typeof render>> } = {};
		onTestFinished(async () => {
			await mounted.screen?.unmount();
		});
		mounted.screen = await render(
			<ComponentFixtureProvider
				options={{
					...options(false),
					iab: { cmpId: 28 },
					initialUI: surface === 'banner' ? 'banner' : 'dialog',
					prefetch: {
						...policyFixture({}, { model: 'iab' }),
						initialIab: {
							cmpId: 28,
							enabled: true,
							...deferInitGvl({ gvl: completeGVL }, '/vendor-list'),
						},
					},
				}}
			>
				{
					{
						banner: <IABConsentBanner />,
						compound: (
							<IABConsentDialog.Root>
								<IABConsentDialog.Card>
									<IABConsentDialog.Footer />
								</IABConsentDialog.Card>
							</IABConsentDialog.Root>
						),
						dialog: <IABConsentDialog />,
					}[surface]
				}
			</ComponentFixtureProvider>
		);
		const button = () =>
			document.querySelector<HTMLButtonElement>(
				surface === 'banner'
					? `[data-testid="iab-consent-banner-${action}-button"]`
					: `[data-testid="iab-consent-dialog-root"] [data-action="${action}"]`
			);
		await vi.waitFor(() => {
			expect(button()).not.toBeNull();
			expect(button()?.disabled).toBe(false);
			expect(fetch).toHaveBeenCalledOnce();
		});
		button()?.click();
		rejectLoad(new Error('offline'));
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
		expect(button()).not.toBeNull();
		button()?.click();
		await vi.waitFor(() => expect(button()).toBeNull());
		expect(fetch).toHaveBeenCalledTimes(2);
	}
);

it.each(['banner', 'dialog'] as const)(
	'a pending IAB %s save preserves a reopened dialog',
	async (surface) => {
		const reply = Promise.withResolvers<{ ok: boolean }>();
		const save = vi.fn(() => reply.promise);
		let controls!: ReturnType<typeof useHeadlessIABConsentUI>;
		const Probe = () => {
			const current = useHeadlessIABConsentUI();
			useEffect(() => {
				controls = current;
			}, [current]);
			return null;
		};
		const mounted: { screen?: Awaited<ReturnType<typeof render>> } = {};
		onTestFinished(async () => {
			await mounted.screen?.unmount();
		});
		mounted.screen = await render(
			<ComponentFixtureProvider
				options={{
					...options(false),
					initialUI: surface,
					mode: custom({ save }),
				}}
			>
				<Probe />
			</ComponentFixtureProvider>
		);
		await vi.waitFor(() => expect(controls.iab?.gvl).toBeTruthy());
		const pending =
			surface === 'banner'
				? controls.performBannerAction('accept')
				: controls.performDialogAction('accept');
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		controls.openDialog();
		await vi.waitFor(() => expect(controls.activeUI).toBe('dialog'));
		reply.resolve({ ok: true });
		await pending;
		expect(controls.activeUI).toBe('dialog');
	}
);

it.each(
	(['banner', 'dialog'] as const).flatMap((surface) =>
		(['accept', 'reject'] as const).flatMap((action) =>
			(['pending', 'rejected'] as const).map((outcome) => ({
				action,
				outcome,
				surface,
			}))
		)
	)
)(
	'the IAB $surface closes on $action before a $outcome save settles',
	async ({ action, outcome, surface }) => {
		const save = vi.fn(() =>
			outcome === 'pending'
				? Promise.withResolvers<{ ok: boolean }>().promise
				: Promise.reject(new Error('offline'))
		);
		let kernel: ConsentKernel | null = null;
		const Probe = () => {
			const current = useContext(KernelContext);
			useEffect(() => {
				kernel = current;
			}, [current]);
			return null;
		};
		const mounted: { screen?: Awaited<ReturnType<typeof render>> } = {};
		onTestFinished(async () => {
			await mounted.screen?.unmount();
		});
		mounted.screen = await render(
			<ComponentFixtureProvider
				options={{
					...options(false),
					initialUI: surface,
					mode: custom({ save }),
				}}
			>
				<Probe />
				{surface === 'banner' ? <IABConsentBanner /> : <IABConsentDialog />}
			</ComponentFixtureProvider>
		);
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
		const snapshot = () => (kernel as ConsentKernel | null)?.getSnapshot();
		button()?.click();
		// Closed in the click task, before the TC string or the request.
		expect(snapshot()?.activeUI).toBe('none');
		await vi.waitFor(() => expect(card(surface)).toBeNull());
		await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
		expect(snapshot()?.iab?.authority).toBeTruthy();
		expect(snapshot()?.promptRequirement.kind).toBe('none');
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(snapshot()?.activeUI).toBe('none');
		expect(card(surface)).toBeNull();
	}
);
