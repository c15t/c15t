/**
 * Vendor links from the GVL or custom vendor config reach `href` only when
 * they are absolute http(s) URLs. Svelte does not block other schemes itself.
 */
import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import IABVendorList from '../lib/components/iab-vendor-list.svelte';
import { getIABTranslations } from '../lib/iab-translations';

const [vendorId, gvlVendor] = Object.entries(completeGVL.vendors)[0] ?? [];

const expand = async (container: HTMLElement, rowId: string) => {
	const trigger = container.querySelector<HTMLElement>(
		`[id="vendor-${rowId}"] [data-slot="preference-item-trigger"]`
	);
	expect(trigger).not.toBeNull();
	await fireEvent.click(trigger as HTMLElement);
	return container.querySelector<HTMLElement>(`[id="vendor-${rowId}"]`);
};

test('renders no link for vendor URLs that are not absolute http(s)', async () => {
	if (!(vendorId && gvlVendor)) {
		throw new Error('fixture has no vendors');
	}
	const { container } = render(IABVendorList, {
		customVendors: [
			{
				id: 'custom-unsafe',
				name: 'Custom Unsafe',
				privacyPolicyUrl: 'data:text/html,hi',
				purposes: [1],
			},
		],
		iabT: getIABTranslations(),
		onClearSelection: vi.fn(),
		onVendorToggle: vi.fn(),
		purposes: [],
		selectedVendorId: null,
		vendorConsents: {},
		vendorData: {
			...completeGVL,
			vendors: {
				[vendorId]: {
					...gvlVendor,
					deviceStorageDisclosureUrl: '//evil.test',
					urls: [
						{
							langId: 'en',
							legIntClaim: '/privacy',
							// oxlint-disable-next-line no-script-url -- Unsafe vendor URLs exercise the link filter.
							privacy: 'javascript:alert(1)',
						},
					],
				},
			},
		},
	});

	const gvlRow = await expand(container, vendorId);
	const customRow = await expand(container, 'custom-unsafe');

	expect(gvlRow?.querySelectorAll('a')).toHaveLength(0);
	expect(customRow?.querySelectorAll('a')).toHaveLength(0);
});
