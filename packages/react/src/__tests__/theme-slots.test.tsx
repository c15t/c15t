/**
 * `theme.slots` styles the stock parts in React too, through the same
 * mapping onto `components` the Astro React island used to apply itself.
 */
import { CONSENT_COMPONENT_SLOT_KEY_MAP } from '@c15t/schema/config';
import type { ConsentComponentSlotKey } from '@c15t/schema/config';
import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import { THEME_SLOT_COMPONENT_KEYS } from '@c15t/ui/utils';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentGate } from '../components/consent-gate';
import { ConsentBanner } from '../components/prompt';
import { ConsentProvider } from '../provider';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

const part = (testId: string) =>
	document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);

describe('theme.slots in React', () => {
	test('every theme slot names a components slot', () => {
		const targets: readonly ConsentComponentSlotKey[] = Object.values(
			THEME_SLOT_COMPONENT_KEYS
		);
		const missing = targets.filter((target) => {
			const [group, slot] = target.split('.') as [string, string];
			const slots = (
				CONSENT_COMPONENT_SLOT_KEY_MAP as Record<string, Record<string, true>>
			)[group];
			return !slots?.[slot];
		});
		expect(missing).toEqual([]);
	});

	test('puts slot classes and styles on the stock banner under components', async () => {
		const { unmount } = await render(
			<ConsentProvider
				options={{
					components: {
						banner: {
							card: { className: 'app-card', style: { color: 'rgb(4, 5, 6)' } },
						},
					},
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(),
					theme: {
						slots: {
							consentBannerCard: {
								className: 'theme-card',
								style: {
									backgroundColor: 'rgb(1, 2, 3)',
									color: 'rgb(7, 8, 9)',
								},
							},
							consentBannerTitle: 'theme-title',
						},
					},
				}}
			>
				<ConsentBanner disableAnimation />
			</ConsentProvider>
		);

		await vi.waitFor(() => expect(part('consent-banner-card')).not.toBeNull());
		const card = part('consent-banner-card');
		expect(card?.classList).toContain('theme-card');
		expect(card?.classList).toContain('app-card');
		// `components` wins where both set a property.
		expect(card).toHaveStyle({
			backgroundColor: 'rgb(1, 2, 3)',
			color: 'rgb(4, 5, 6)',
		});
		expect(part('consent-banner-title')?.classList).toContain('theme-title');
		unmount();
	});

	test('drops the stock classes of a part whose slot sets noStyle', async () => {
		const { unmount } = await render(
			<ConsentProvider
				options={{
					components: {
						banner: { card: { className: 'app-card' } },
					},
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(),
					theme: {
						slots: {
							consentBannerCard: { className: 'theme-card', noStyle: true },
							consentBannerTitle: { noStyle: true },
						},
					},
				}}
			>
				<ConsentBanner disableAnimation />
			</ConsentProvider>
		);

		await vi.waitFor(() => expect(part('consent-banner-card')).not.toBeNull());
		const card = part('consent-banner-card');
		expect(card?.className).toBe('theme-card app-card');
		expect(card?.hasAttribute('nostyle')).toBe(false);
		// A slot with only `noStyle` still applies.
		const title = part('consent-banner-title');
		expect(title?.classList).not.toContain(bannerStyles.title);
		// Parts without the flag keep their stock classes.
		expect(part('consent-banner-header')?.classList).toContain(
			bannerStyles.header
		);
		unmount();
	});

	test('styles the ConsentGate placeholder through the consentGate slots', async () => {
		const { unmount } = await render(
			<ConsentProvider
				options={{
					components: {
						'consent-gate': {
							button: { className: 'app-button' },
							root: { style: { color: 'rgb(4, 5, 6)' } },
						},
					},
					mode: offline(),
					persistence: false,
					prefetch: policyFixture(),
					theme: {
						slots: {
							consentGate: {
								className: 'theme-gate',
								style: {
									backgroundColor: 'rgb(1, 2, 3)',
									color: 'rgb(7, 8, 9)',
								},
							},
							consentGateButton: 'theme-gate-button',
							consentGateTitle: 'theme-gate-title',
						},
					},
				}}
			>
				<ConsentGate category="marketing">
					<div>Marketing content</div>
				</ConsentGate>
			</ConsentProvider>
		);

		await vi.waitFor(() =>
			expect(part('consent-gate-placeholder')).not.toBeNull()
		);
		const placeholder = part('consent-gate-placeholder');
		expect(placeholder?.classList).toContain('theme-gate');
		// `components` wins where both set a property.
		expect(placeholder).toHaveStyle({
			backgroundColor: 'rgb(1, 2, 3)',
			color: 'rgb(4, 5, 6)',
		});
		expect(part('consent-gate-title')?.classList).toContain('theme-gate-title');
		const button = part('consent-gate-button');
		expect(button?.classList).toContain('theme-gate-button');
		expect(button?.classList).toContain('app-button');
		unmount();
	});
});
