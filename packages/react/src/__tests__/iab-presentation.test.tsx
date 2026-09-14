import { MINIMAL_GVL } from '@c15t/conformance';
import {
	custom,
	createConsentKernel,
	resolveIABBannerSummary,
} from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

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
