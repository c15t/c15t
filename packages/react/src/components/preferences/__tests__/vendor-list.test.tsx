/**
 * Vendor rows nested under a category in the consent widget.
 *
 * A vendor switch stages a per-vendor grant on the same draft as the
 * category switches; nothing is recorded until Save. Saving with one vendor
 * off denies exactly that vendor, keeps the category granted, and leaves the
 * other vendor in that category loading. A category that is off in the
 * draft disables its vendor switches. Accept all clears the denial.
 */
import type { Vendor } from '@c15t/core';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { page } from 'vitest/browser';

import { ComponentFixtureProvider as ConsentProvider } from '~/__tests__/component-fixture-provider';
import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentWidget } from '~/components/preferences';
import { useConsent, useVendorAllowed, useVendorChoice } from '~/hooks';
import { offline } from '~/transports/offline';

const CATEGORIES = ['necessary', 'marketing', 'measurement'] as const;

const VENDORS: Vendor[] = [
	{
		category: 'marketing',
		description: 'Ad conversion measurement.',
		id: 'meta-pixel',
		name: 'Meta Pixel',
		privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
	},
	{
		category: 'marketing',
		id: 'google-ads',
		name: 'Google Ads',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
	{
		category: 'measurement',
		id: 'google-analytics',
		name: 'Google Analytics',
		privacyPolicyUrl: 'https://policies.google.com/privacy',
	},
	{
		category: { or: ['marketing', 'measurement'] },
		id: 'shared-vendor',
		name: 'Shared Vendor',
		privacyPolicyUrl: 'https://example.com/privacy',
	},
	{
		category: { not: 'marketing' },
		id: 'negated-vendor',
		name: 'Negated Vendor',
		privacyPolicyUrl: 'https://example.com/privacy',
	},
	{
		category: 'marketing',
		disabled: true,
		id: 'fixed-vendor',
		name: 'Fixed Vendor',
		privacyPolicyUrl: 'https://example.com/privacy',
	},
];

const Probe = () => {
	const marketing = useConsent('marketing');
	const meta = useVendorAllowed('meta-pixel');
	const ads = useVendorAllowed('google-ads');
	const denied = useVendorChoice()?.denied ?? [];
	return (
		<output data-testid="probe">
			{JSON.stringify({ ads, denied, marketing, meta })}
		</output>
	);
};

const readProbe = () =>
	JSON.parse(
		document.querySelector('[data-testid="probe"]')?.textContent ?? '{}'
	) as { ads: boolean; denied: string[]; marketing: boolean; meta: boolean };

const renderWidget = (
	values: Partial<Record<'marketing' | 'measurement', boolean>> = {}
) =>
	render(
		<ConsentProvider
			options={{
				consentCategories: [...CATEGORIES],
				mode: offline(),
				persistence: false,
				prefetch: policyFixture(values, {
					categories: ['marketing', 'measurement'],
					id: 'vendor-rows',
					model: 'opt-in',
					prompt: 'choice',
				}),
				vendors: VENDORS,
			}}
		>
			<ConsentWidget />
			<Probe />
		</ConsentProvider>
	);

describe('consent widget vendor rows', () => {
	test('lists a category’s vendors and denies exactly the one turned off', async () => {
		renderWidget({ marketing: true, measurement: true });

		// Vendors sit inside the category description, which the trigger expands.
		await page
			.getByTestId('consent-widget-accordion-trigger-marketing')
			.click();
		const list = page.getByTestId('consent-widget-vendor-list-marketing');
		await expect.element(list).toBeVisible();
		await expect
			.element(
				page.getByTestId('consent-widget-vendor-item-marketing-meta-pixel')
			)
			.toHaveTextContent('Meta Pixel');
		await expect
			.element(
				page.getByTestId('consent-widget-vendor-item-marketing-meta-pixel')
			)
			.toHaveTextContent('Ad conversion measurement.');
		// The measurement vendor lives under its own category, not this one.
		const marketingList = document.querySelector(
			'[data-testid="consent-widget-vendor-list-marketing"]'
		);
		expect(
			marketingList?.querySelector(
				'[data-testid="consent-widget-vendor-item-measurement-google-analytics"]'
			)
		).toBeNull();
		expect(
			document
				.querySelector('[data-testid="consent-widget-vendor-list-measurement"]')
				?.querySelector(
					'[data-testid="consent-widget-vendor-item-measurement-google-analytics"]'
				)
		).not.toBeNull();

		// The switch is addressed by its accessible name, which is part of the
		// contract; test ids keep category-scoped membership assertions.
		const meta = list.getByRole('switch', { name: 'Allow Meta Pixel' });
		await expect.element(meta).toHaveAttribute('aria-checked', 'true');
		await meta.click();
		await expect.element(meta).toHaveAttribute('aria-checked', 'false');
		// A draft toggle records nothing.
		expect(readProbe().meta).toBe(true);

		await page.getByTestId('consent-widget-footer-save-button').click();
		await vi.waitFor(() => {
			expect(readProbe()).toEqual({
				ads: true,
				denied: ['meta-pixel'],
				marketing: true,
				meta: false,
			});
		});
	});

	test('disables vendor switches while the category is off and re-enables them', async () => {
		renderWidget({ marketing: false, measurement: true });
		await page
			.getByTestId('consent-widget-accordion-trigger-marketing')
			.click();
		const meta = page.getByTestId(
			'consent-widget-vendor-switch-marketing-meta-pixel'
		);
		await expect.element(meta).toBeDisabled();
		await expect
			.element(page.getByTestId('consent-widget-vendor-hint-marketing'))
			.toBeVisible();

		await page.getByTestId('consent-widget-switch-marketing').click();
		await expect.element(meta).toBeEnabled();
		expect(
			document.querySelector(
				'[data-testid="consent-widget-vendor-hint-marketing"]'
			)
		).toBeNull();
	});

	test('a shared vendor gets a distinct label id per category and a negated one is not listed', async () => {
		renderWidget({ marketing: true, measurement: true });
		await page
			.getByTestId('consent-widget-accordion-trigger-marketing')
			.click();
		const ids = [...document.querySelectorAll('[id$="-shared-vendor"]')].map(
			(element) => element.id
		);
		expect(new Set(ids).size).toBe(2);
		expect(ids.map((id) => id.replace(/^.*vendor-/u, '')).sort()).toEqual([
			'marketing-shared-vendor',
			'measurement-shared-vendor',
		]);
		// The switch points at the label of its own instance.
		const meta = document.querySelector(
			'[data-testid="consent-widget-vendor-switch-marketing-meta-pixel"]'
		);
		const described = meta?.getAttribute('aria-describedby');
		expect(described).toBeTruthy();
		expect(document.getElementById(described ?? '')?.textContent).toBe(
			'Meta Pixel'
		);
		expect(
			document.querySelector(
				'[data-testid="consent-widget-vendor-item-marketing-negated-vendor"]'
			)
		).toBeNull();
	});

	test('a disabled vendor is listed without a switch', async () => {
		renderWidget({ marketing: true, measurement: true });
		await page
			.getByTestId('consent-widget-accordion-trigger-marketing')
			.click();
		await expect
			.element(
				page.getByTestId('consent-widget-vendor-item-marketing-fixed-vendor')
			)
			.toHaveTextContent('Fixed Vendor');
		expect(
			document.querySelector(
				'[data-testid="consent-widget-vendor-switch-marketing-fixed-vendor"]'
			)
		).toBeNull();
	});

	test('accept all discards a staged vendor denial instead of recording it', async () => {
		renderWidget({ marketing: true, measurement: true });
		await page
			.getByTestId('consent-widget-accordion-trigger-marketing')
			.click();
		await page
			.getByTestId('consent-widget-vendor-switch-marketing-meta-pixel')
			.click();
		await page.getByTestId('consent-widget-footer-accept-all-button').click();
		await vi.waitFor(() => {
			expect(readProbe()).toEqual({
				ads: true,
				denied: [],
				marketing: true,
				meta: true,
			});
		});
	});

	test('accept all clears a recorded denial', async () => {
		renderWidget({ marketing: true, measurement: true });
		await page
			.getByTestId('consent-widget-accordion-trigger-marketing')
			.click();
		await page
			.getByTestId('consent-widget-vendor-switch-marketing-meta-pixel')
			.click();
		await page.getByTestId('consent-widget-footer-save-button').click();
		await vi.waitFor(() => {
			expect(readProbe().denied).toEqual(['meta-pixel']);
		});

		await page.getByTestId('consent-widget-footer-accept-all-button').click();
		await vi.waitFor(() => {
			expect(readProbe()).toEqual({
				ads: true,
				denied: [],
				marketing: true,
				meta: true,
			});
		});
	});
});
