/**
 * `theme.slots` reaches each stock part the way it does in React and Vue:
 * the slot's classes and its `style`, with camelCase style keys, and only
 * on the part the slot names.
 */
import { custom } from '@c15t/core';
import type { ComponentSlots } from '@c15t/ui/theme';
import { render, waitFor } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';

import type { ConsentManagerOptions } from '../lib/types';
import Fixture from './fixtures/theme-slots-fixture.svelte';
import { policyFixture } from './policy-fixture';

const SLOT = {
	className: 'brand-slot',
	style: { '--slot-mark': 'rgb(1, 2, 3)', backgroundColor: 'rgb(1, 2, 3)' },
};

const renderWithSlots = async function renderWithSlots(
	slots: ComponentSlots
): Promise<void> {
	render(Fixture, {
		options: {
			legalLinks: { privacyPolicy: { href: 'https://example.test/privacy' } },
			mode: custom({}),
			persistence: false,
			prefetch: policyFixture(),
			theme: { slots },
		} as ConsentManagerOptions,
	});
	await waitFor(() => {
		expect(
			document.querySelector('[data-testid="consent-banner-card"]')
		).not.toBeNull();
		expect(
			document.querySelector('[data-testid="consent-dialog-card"]')
		).not.toBeNull();
	});
};

const part = (testId: string): HTMLElement => {
	const element = document.querySelector<HTMLElement>(
		`[data-testid="${testId}"]`
	);
	if (!element) {
		throw new Error(`${testId} did not render`);
	}
	return element;
};

describe('theme.slots in Svelte', () => {
	test.each([
		['consentBanner', 'consent-banner-root'],
		['consentBannerCard', 'consent-banner-card'],
		['consentBannerHeader', 'consent-banner-header'],
		['consentBannerTitle', 'consent-banner-title'],
		['consentBannerDescription', 'consent-banner-description'],
		['consentBannerFooter', 'consent-banner-footer'],
		['consentBannerFooterSubGroup', 'consent-banner-footer-sub-group'],
		['consentBannerTag', 'consent-banner-branding'],
		['consentDialog', 'consent-dialog-root'],
		['consentDialogCard', 'consent-dialog-card'],
		['consentDialogHeader', 'consent-dialog-header'],
		['consentDialogTitle', 'consent-dialog-title'],
		['consentDialogDescription', 'consent-dialog-description'],
		['consentDialogContent', 'consent-dialog-content'],
		['consentDialogOverlay', 'consent-dialog-overlay'],
		['consentWidget', 'consent-widget-root'],
		['consentWidgetFooter', 'consent-widget-footer'],
		['consentWidgetAccordion', 'consent-widget-accordion'],
		['toggle', 'consent-widget-switch-necessary'],
	] as const)('%s puts its class and style on %s', async (slot, testId) => {
		await renderWithSlots({ [slot]: SLOT });

		const element = part(testId);
		expect(element.classList).toContain('brand-slot');
		expect(element.style.getPropertyValue('background-color')).toBe(
			'rgb(1, 2, 3)'
		);
		expect(element.style.getPropertyValue('--slot-mark')).toBe('rgb(1, 2, 3)');
	});

	test('legal links keep only the stock link class', async () => {
		await renderWithSlots({
			consentBannerDescription: 'banner-description-slot',
			consentDialogContent: 'dialog-content-slot',
		});

		const links = [
			part('consent-banner-legal-link-privacyPolicy'),
			part('consent-dialog-legal-link-privacyPolicy'),
		];
		for (const link of links) {
			expect(link.classList).not.toContain('banner-description-slot');
			expect(link.classList).not.toContain('dialog-content-slot');
		}
		expect(part('consent-banner-description').classList).toContain(
			'banner-description-slot'
		);
	});
});
