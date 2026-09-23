/**
 * Vendor rows nested under a category in the Svelte consent widget.
 *
 * A vendor switch stages a per-vendor grant on the same draft as the
 * category switches; nothing is recorded until Save. Saving with one vendor
 * off denies exactly that vendor and keeps the category granted. A category
 * that is off in the draft disables its vendor switches. Accept all clears
 * the denial. The markup mirrors the React rows so parity holds.
 */
import type { Vendor } from '@c15t/core';
import accordionStyles from '@c15t/ui/styles/components/accordion';
import switchStyles from '@c15t/ui/styles/components/switch';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test } from 'vitest';

import WidgetFixture from '../../__tests__/fixtures/widget-fixture.svelte';
import { policyFixture } from '../../__tests__/policy-fixture';
import { testOffline } from '../../__tests__/test-offline';
import type { ConsentContextValue } from '../../lib/context.svelte';

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

const byTestId = (id: string) =>
	document.querySelector<HTMLElement>(`[data-testid="${id}"]`);

const renderWidget = (
	values: Record<'marketing' | 'measurement', boolean>,
	noStyle = false
) => {
	let context: ConsentContextValue | undefined;
	render(WidgetFixture, {
		capture: (captured: ConsentContextValue) => {
			context = captured;
		},
		noStyle,
		options: {
			consentCategories: ['necessary', 'marketing', 'measurement'],
			mode: testOffline(),
			persistence: false,
			prefetch: policyFixture(values, {
				categories: ['marketing', 'measurement'],
				id: 'vendor-rows',
				model: 'opt-in',
				prompt: 'choice',
			}),
			vendors: VENDORS,
		},
	});
	const kernel = () => {
		if (!context) {
			throw new Error('context not captured');
		}
		return context.kernel;
	};
	return { kernel, state: () => context?.state };
};

const open = async (category: string) => {
	const trigger = await waitFor(() => {
		const element = byTestId(`consent-widget-accordion-trigger-${category}`);
		expect(element).toBeInTheDocument();
		return element as HTMLElement;
	});
	await fireEvent.click(trigger);
};

describe('Svelte consent widget vendor rows', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('lists a category’s vendors as cards and denies exactly the one turned off', async () => {
		const { kernel } = renderWidget({ marketing: true, measurement: true });
		await open('marketing');
		const list = byTestId('consent-widget-vendor-list-marketing');
		expect(list?.getAttribute('aria-label')).toBe('Vendors (4)');
		expect(
			list?.querySelector(
				'[data-testid="consent-widget-vendor-item-measurement-google-analytics"]'
			)
		).toBeNull();
		expect(
			byTestId('consent-widget-vendor-list-measurement')?.querySelector(
				'[data-testid="consent-widget-vendor-item-measurement-google-analytics"]'
			)
		).not.toBeNull();

		const trigger = byTestId(
			'consent-widget-vendor-trigger-marketing-meta-pixel'
		) as HTMLElement;
		const content = byTestId(
			'consent-widget-vendor-content-marketing-meta-pixel'
		);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');
		expect(content?.getAttribute('data-state')).toBe('closed');
		await fireEvent.click(trigger);
		await waitFor(() => {
			expect(trigger.getAttribute('aria-expanded')).toBe('true');
		});
		expect(content?.textContent).toContain('Ad conversion measurement.');
		expect(content?.textContent).toContain('Privacy policy');

		const meta = byTestId(
			'consent-widget-vendor-switch-marketing-meta-pixel'
		) as HTMLElement;
		expect(meta.getAttribute('aria-label')).toBe('Allow Meta Pixel');
		expect(meta.getAttribute('aria-checked')).toBe('true');
		const describedBy = meta.getAttribute('aria-describedby') ?? '';
		expect(
			document.getElementById(describedBy)?.getAttribute('data-testid')
		).toBe('consent-widget-vendor-name-marketing-meta-pixel');
		await fireEvent.click(meta);
		await waitFor(() => {
			expect(meta.getAttribute('aria-checked')).toBe('false');
		});
		// A draft toggle records nothing.
		expect(kernel().getSnapshot().vendorChoice).toBeNull();

		await fireEvent.click(
			byTestId('consent-widget-footer-save-button') as HTMLElement
		);
		await waitFor(() => {
			expect(kernel().getSnapshot().vendorChoice?.denied).toEqual([
				'meta-pixel',
			]);
		});
		expect(kernel().getSnapshot().effectivePermissions.marketing).toBe(true);
	});

	test('disables vendor switches while the category is off and re-enables them', async () => {
		renderWidget({ marketing: false, measurement: true });
		await open('marketing');
		const meta = byTestId(
			'consent-widget-vendor-switch-marketing-meta-pixel'
		) as HTMLElement;
		expect(meta.hasAttribute('disabled')).toBe(true);
		expect(byTestId('consent-widget-vendor-hint-marketing')).not.toBeNull();
		await fireEvent.click(
			byTestId('consent-widget-switch-marketing') as HTMLElement
		);
		await waitFor(() => {
			expect(meta.hasAttribute('disabled')).toBe(false);
		});
		expect(byTestId('consent-widget-vendor-hint-marketing')).toBeNull();
	});

	test('a disabled vendor has no switch, a negated one is not listed, a shared one has two ids', async () => {
		renderWidget({ marketing: true, measurement: true });
		await open('marketing');
		expect(
			byTestId('consent-widget-vendor-item-marketing-fixed-vendor')?.textContent
		).toContain('Fixed Vendor');
		expect(
			byTestId('consent-widget-vendor-switch-marketing-fixed-vendor')
		).toBeNull();
		expect(
			byTestId('consent-widget-vendor-item-marketing-negated-vendor')
		).toBeNull();
		const ids = [...document.querySelectorAll('[id$="-shared-vendor"]')].map(
			(element) => element.id
		);
		expect(new Set(ids).size).toBe(2);
	});

	test('accept all discards a staged vendor denial instead of recording it', async () => {
		const { kernel } = renderWidget({ marketing: true, measurement: true });
		await open('marketing');
		await fireEvent.click(
			byTestId(
				'consent-widget-vendor-switch-marketing-meta-pixel'
			) as HTMLElement
		);
		await fireEvent.click(
			byTestId('consent-widget-footer-accept-all-button') as HTMLElement
		);
		await waitFor(() => {
			expect(kernel().getSnapshot().vendorChoice).not.toBeNull();
		});
		expect(kernel().getSnapshot().vendorChoice?.denied).toEqual([]);
		await waitFor(() => {
			expect(
				byTestId(
					'consent-widget-vendor-switch-marketing-meta-pixel'
				)?.getAttribute('aria-checked')
			).toBe('true');
		});
	});

	test('the manager state stages, saves and clears a vendor', async () => {
		const { kernel, state } = renderWidget({
			marketing: true,
			measurement: true,
		});
		await open('marketing');
		state()?.setSelectedVendor('meta-pixel', false);
		expect(state()?.selectedVendors['meta-pixel']).toBe(false);
		// An id that is not toggleable is ignored.
		state()?.setSelectedVendor('fixed-vendor', false);
		expect(state()?.selectedVendors['fixed-vendor']).toBe(true);
		await state()?.saveConsents('custom');
		expect(kernel().getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
		await state()?.saveConsents('all');
		expect(kernel().getSnapshot().vendorChoice?.denied).toEqual([]);
		expect(state()?.draft.vendors['meta-pixel']).toBe(true);
	});

	test('save refuses a draft whose vendor list changed under it', async () => {
		const { kernel, state } = renderWidget({
			marketing: true,
			measurement: true,
		});
		await open('marketing');
		// A category edit alone records the surface the visitor reviewed.
		state()?.setSelectedConsent('measurement', false);
		kernel().set.vendors({
			declared: [
				{
					category: 'measurement',
					id: 'late-vendor',
					name: 'Late',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/privacy',
					source: 'config',
				},
			],
		});
		await waitFor(() => {
			expect(state()?.draft.isStale).toBe(true);
		});
		// The public API bypasses the disabled button; the guard holds.
		await expect(state()?.saveConsents('custom')).rejects.toThrow(
			/policy changed/u
		);
		expect(
			kernel().getSnapshot().explicitChoice?.categories.measurement?.value
		).toBe(true);
	});

	test('a vendor moved back to its seeded value leaves nothing to review', async () => {
		const { kernel, state } = renderWidget({
			marketing: true,
			measurement: true,
		});
		await open('marketing');
		state()?.setSelectedVendor('meta-pixel', false);
		state()?.setSelectedVendor('meta-pixel', true);
		state()?.setSelectedConsent('measurement', false);
		state()?.setSelectedConsent('measurement', true);
		// The draft is back at its baseline, so a late declaration is not a
		// change under an edit and must not block the next save.
		kernel().set.vendors({
			declared: [
				{
					category: 'marketing',
					id: 'late-vendor',
					name: 'Late',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/privacy',
					source: 'config',
				},
			],
		});
		await waitFor(() => {
			expect(state()?.draft.vendors['late-vendor']).toBe(true);
		});
		expect(state()?.draft.isStale).toBe(false);
		await expect(state()?.saveConsents('custom')).resolves.toBeUndefined();
	});

	test('a settled draft follows a vendor record another island writes', async () => {
		const { kernel, state } = renderWidget({
			marketing: true,
			measurement: true,
		});
		await open('marketing');
		state()?.setSelectedVendor('meta-pixel', false);
		state()?.setSelectedVendor('meta-pixel', true);
		// Another surface on the same runtime records a denial. The draft
		// has nothing staged, so it must show the record, and a save must
		// not re-grant a vendor the visitor never touched.
		await kernel().commands.save({}, { vendors: { 'meta-pixel': false } });
		await waitFor(() => {
			expect(state()?.draft.vendors['meta-pixel']).toBe(false);
		});
		await state()?.saveConsents('custom');
		expect(kernel().getSnapshot().vendorChoice?.denied).toEqual(['meta-pixel']);
	});

	test('a category moved back to its baseline is not saved under a later policy', async () => {
		const { kernel, state } = renderWidget({
			marketing: true,
			measurement: true,
		});
		await open('marketing');
		state()?.setSelectedConsent('measurement', false);
		state()?.setSelectedConsent('measurement', true);
		// Another surface records a denial for measurement: the baseline moved.
		// The draft has nothing staged, so it must follow the record, not
		// resurrect the value the visitor set and unset.
		await kernel().commands.save({ measurement: false });
		await waitFor(() => {
			expect(state()?.selectedConsents.measurement).toBe(false);
		});
		expect(state()?.draft.isStale).toBe(false);
		await state()?.saveConsents('custom');
		expect(
			kernel().getSnapshot().explicitChoice?.categories.measurement?.value
		).toBe(false);
	});

	test('the category content and switches carry the class names React renders', async () => {
		renderWidget({ marketing: true, measurement: true });
		await open('marketing');
		// React's accordion root is headless, so its content carries the
		// accordion classes alone; stacking the preference-item classes on
		// top changed the description colour. Its switches take the shared
		// switch class map and size through data-size.
		const content = byTestId('consent-widget-accordion-content-marketing');
		expect([...(content?.classList ?? [])]).toEqual([accordionStyles.content]);
		expect([
			...(content?.querySelector('[data-slot="preference-item-content-inner"]')
				?.classList ?? []),
		]).toEqual([accordionStyles.contentInner]);
		for (const id of [
			'consent-widget-switch-marketing',
			'consent-widget-vendor-switch-marketing-meta-pixel',
		]) {
			const control = byTestId(id);
			expect([...(control?.classList ?? [])]).toEqual([switchStyles.root]);
			expect(control?.getAttribute('data-size')).toBe('small');
			expect([
				...(control?.querySelector('[data-slot="switch-track"]')?.classList ??
					[]),
			]).toEqual([switchStyles.track]);
		}
	});

	test('noStyle drops the built-in classes from the vendor cards', async () => {
		renderWidget({ marketing: true, measurement: true }, true);
		await open('marketing');
		const item = await waitFor(() => {
			const element = byTestId(
				'consent-widget-vendor-item-marketing-meta-pixel'
			);
			expect(element).toBeInTheDocument();
			return element as HTMLElement;
		});
		expect(item.className).toBe('');
		const content = byTestId(
			'consent-widget-vendor-content-marketing-meta-pixel'
		);
		expect(content?.className).toBe('');
		expect(
			content?.querySelector('[data-slot="preference-item-content-viewport"]')
				?.className
		).toBe('');
		expect(
			content?.querySelector('[data-slot="preference-item-content-inner"]')
				?.className
		).toBe('');
	});

	test('a vendor declared after a staged toggle marks the draft stale', async () => {
		const { kernel, state } = renderWidget({
			marketing: true,
			measurement: true,
		});
		await open('marketing');
		state()?.setSelectedVendor('meta-pixel', false);
		expect(state()?.draft.isStale).toBe(false);
		// A script registering only its slug adds no row, so the draft stays fresh.
		kernel().set.vendors({
			declared: [
				{
					category: 'marketing',
					id: 'slug-only',
					name: 'slug-only',
					presentable: false,
					privacyPolicyUrl: '',
					source: 'script',
				},
			],
		});
		await waitFor(() => {
			expect(
				kernel()
					.getSnapshot()
					.vendors?.declared.some((vendor) => vendor.id === 'slug-only')
			).toBe(true);
		});
		expect(state()?.draft.isStale).toBe(false);
		kernel().set.vendors({
			declared: [
				{
					category: 'marketing',
					id: 'late-vendor',
					name: 'Late',
					presentable: true,
					privacyPolicyUrl: 'https://example.com/privacy',
					source: 'config',
				},
			],
		});
		await waitFor(() => {
			expect(state()?.draft.isStale).toBe(true);
		});
	});
});
