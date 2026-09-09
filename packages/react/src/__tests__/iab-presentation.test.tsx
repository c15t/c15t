import { MINIMAL_GVL } from '@c15t/conformance';
import { custom } from '@c15t/core';
import type { GlobalVendorList } from '@c15t/schema/types';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { IABConsentBanner } from '../components/iab-consent-banner';
import { IABConsentDialog } from '../components/iab-consent-dialog';
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
			if (blocking) {
				await vi.waitFor(() =>
					expect(card('banner')?.contains(document.activeElement)).toBe(true)
				);
			}
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
			if (blocking) {
				await vi.waitFor(() =>
					expect(card('dialog')?.contains(document.activeElement)).toBe(true)
				);
			}
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
