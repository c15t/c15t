/**
 * `theme.slots` reaches the stock parts it names, and keeps its classes
 * under `noStyle` the way `resolveStyles` in `@c15t/ui` does.
 */

import { render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, test } from 'vitest';

import BannerFixture from '../../__tests__/fixtures/banner-fixture.svelte';
import DialogFixture from '../../__tests__/fixtures/dialog-fixture.svelte';
import PanelTriggerFixture from '../../__tests__/fixtures/panel-trigger-fixture.svelte';
import { testOffline } from '../../__tests__/test-offline';

const part = async function part(testId: string): Promise<HTMLElement> {
	let found: HTMLElement | null = null;
	await waitFor(() => {
		found = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
		expect(found).not.toBeNull();
	});
	return found as unknown as HTMLElement;
};

afterEach(() => {
	window.localStorage.clear();
	for (const cookie of document.cookie.split(';')) {
		const name = cookie.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
		}
	}
});

describe('theme.slots', () => {
	test('keeps banner slot classes when noStyle drops the stock ones', async () => {
		render(BannerFixture, {
			options: {
				mode: testOffline(),
				noStyle: true,
				theme: {
					slots: {
						consentBannerCard: 'brand-card',
						consentBannerDescription: 'brand-description',
						consentBannerFooter: 'brand-footer',
						consentBannerFooterSubGroup: 'brand-group',
						consentBannerHeader: 'brand-header',
						consentBannerTitle: 'brand-title',
					},
				},
			},
		});

		expect((await part('consent-banner-card')).className).toBe('brand-card');
		expect((await part('consent-banner-header')).className).toBe(
			'brand-header'
		);
		expect((await part('consent-banner-title')).className).toBe('brand-title');
		expect((await part('consent-banner-description')).className).toBe(
			'brand-description'
		);
		expect((await part('consent-banner-footer')).className).toBe(
			'brand-footer'
		);
		expect((await part('consent-banner-footer-sub-group')).className).toBe(
			'brand-group'
		);
	});

	test('keeps dialog and widget slot classes when noStyle drops the stock ones', async () => {
		render(DialogFixture, {
			open: true,
			options: {
				mode: testOffline(),
				noStyle: true,
				theme: {
					slots: {
						consentDialogCard: 'brand-dialog-card',
						consentDialogContent: 'brand-dialog-content',
						consentDialogHeader: 'brand-dialog-header',
						consentDialogTitle: 'brand-dialog-title',
						consentWidgetFooter: 'brand-widget-footer',
						consentWidgetFooterSubGroup: 'brand-widget-group',
					},
				},
			},
		});

		expect((await part('consent-dialog-card')).className).toBe(
			'brand-dialog-card'
		);
		expect((await part('consent-dialog-header')).className).toBe(
			'brand-dialog-header'
		);
		expect((await part('consent-dialog-title')).className).toBe(
			'brand-dialog-title'
		);
		expect((await part('consent-dialog-content')).className).toBe(
			'brand-dialog-content'
		);
		expect((await part('consent-widget-footer')).className).toBe(
			'brand-widget-footer'
		);
		// The sub group reads its own key, not the footer's.
		expect(
			(await part('consent-widget-footer-sub-group')).classList
		).not.toContain('brand-widget-footer');
		expect((await part('consent-widget-footer-sub-group')).className).toBe(
			'brand-widget-group'
		);
	});

	test('applies the trigger slots to the floating button and its icon', async () => {
		render(PanelTriggerFixture, {
			options: {
				mode: testOffline(),
				theme: {
					slots: {
						consentDialogTrigger: {
							className: 'brand-trigger',
							style: { '--brand-ring': '#0a66ff' },
						},
						consentDialogTriggerIcon: 'brand-trigger-icon',
					},
				},
			},
		});

		const trigger = await part('consent-dialog-trigger');
		expect(trigger.classList).toContain('brand-trigger');
		// The stock classes stay underneath the slot's.
		expect(trigger.classList.length).toBeGreaterThan(1);
		expect(trigger.style.getPropertyValue('--brand-ring')).toBe('#0a66ff');
		expect(trigger.querySelector('[aria-hidden="true"]')?.classList).toContain(
			'brand-trigger-icon'
		);
	});
});
