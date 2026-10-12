/**
 * `theme.slots` reaches the IAB banner and dialog parts the way React, Vue,
 * Astro and the script tag apply it: classes and `style` on the part the
 * slot names.
 */
import { custom } from '@c15t/core';
import { resolvePolicyRules } from '@c15t/schema/types';
import bannerStyles from '@c15t/ui/styles/components/iab-consent-banner';
import dialogStyles from '@c15t/ui/styles/components/iab-consent-dialog';
import type { ComponentSlots } from '@c15t/ui/theme';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import type { ConsentManagerOptions } from '../lib/types';
import ConformanceFixture from './fixtures/conformance-fixture.svelte';

const SLOT = {
	className: 'brand-slot',
	style: { '--slot-mark': 'rgb(1, 2, 3)', backgroundColor: 'rgb(1, 2, 3)' },
};

const renderIAB = async function renderIAB(
	component: 'iab-consent-banner' | 'iab-consent-dialog',
	slots: ComponentSlots
): Promise<void> {
	render(ConformanceFixture, {
		component,
		options: {
			disableAnimation: true,
			iab: { cmpId: 28 },
			mode: custom({}),
			persistence: false,
			prefetch: {
				initialIab: { cmpId: 28, enabled: true, gvl: completeGVL },
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
			theme: { slots },
		} as ConsentManagerOptions,
	});
	await waitFor(() =>
		expect(
			document.querySelector(`[data-testid="${component}-card"]`)
		).not.toBeNull()
	);
};

const byClass = (className: string | undefined): HTMLElement | null =>
	className ? document.querySelector<HTMLElement>(`.${className}`) : null;

/** What a part took from `SLOT`: its class and both inline styles. */
const slotOn = (element: HTMLElement | null) => ({
	backgroundColor: element?.style.getPropertyValue('background-color'),
	hasClass: element?.classList.contains('brand-slot'),
	mark: element?.style.getPropertyValue('--slot-mark'),
});

const APPLIED = {
	backgroundColor: 'rgb(1, 2, 3)',
	hasClass: true,
	mark: 'rgb(1, 2, 3)',
};

describe('theme.slots on the Svelte IAB surfaces', () => {
	test.each([
		[
			'iabConsentBanner',
			() =>
				document.querySelector<HTMLElement>(
					'[data-testid="iab-consent-banner-root"]'
				),
		],
		[
			'iabConsentBannerCard',
			() =>
				document.querySelector<HTMLElement>(
					'[data-testid="iab-consent-banner-card"]'
				),
		],
		[
			'iabConsentBannerHeader',
			() =>
				document.querySelector<HTMLElement>(
					'[data-testid="iab-consent-banner-header"]'
				),
		],
		[
			'iabConsentBannerFooter',
			() =>
				document.querySelector<HTMLElement>(
					'[data-testid="iab-consent-banner-footer"]'
				),
		],
	] as const)('%s styles its banner part', async (slot, find) => {
		await renderIAB('iab-consent-banner', { [slot]: SLOT });
		expect(slotOn(find())).toEqual(APPLIED);
	});

	test.each([
		[
			'iabConsentDialog',
			() =>
				document.querySelector<HTMLElement>(
					'[data-testid="iab-consent-dialog-root"]'
				),
		],
		[
			'iabConsentDialogCard',
			() =>
				document.querySelector<HTMLElement>(
					'[data-testid="iab-consent-dialog-card"]'
				),
		],
		['iabConsentDialogHeader', () => byClass(dialogStyles.header)],
		['iabConsentDialogFooter', () => byClass(dialogStyles.footer)],
	] as const)('%s styles its dialog part', async (slot, find) => {
		await renderIAB('iab-consent-dialog', { [slot]: SLOT });
		expect(slotOn(find())).toEqual(APPLIED);
	});

	test('the banner keeps its stock classes under a slot', async () => {
		await renderIAB('iab-consent-banner', { iabConsentBannerCard: SLOT });
		expect(
			document.querySelector('[data-testid="iab-consent-banner-card"]')
				?.classList
		).toContain(bannerStyles.card);
	});
});
