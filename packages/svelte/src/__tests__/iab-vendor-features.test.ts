/**
 * TCF policy check 14: wherever the vendor list shows a partner's Features,
 * it shows each feature's description and the standard Features text, and no
 * control.
 */
import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import { completeGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import IABVendorList from '../lib/components/iab-vendor-list.svelte';
import { getIABTranslations } from '../lib/iab-translations';

const vendorId = Object.values(completeGVL.vendors).find(
	(vendor) => (vendor.features ?? []).length > 0
)?.id;

const renderList = async (vendorData: typeof completeGVL) => {
	const view = render(IABVendorList, {
		iabT: getIABTranslations(),
		onClearSelection: vi.fn(),
		onVendorToggle: vi.fn(),
		purposes: [],
		selectedVendorId: null,
		vendorConsents: {},
		vendorData,
	});
	const trigger = view.container.querySelector<HTMLElement>(
		`#vendor-${vendorId} [data-slot="preference-item-trigger"]`
	);
	expect(trigger).not.toBeNull();
	await fireEvent.click(trigger as HTMLElement);
	return view;
};

test('shows each feature with its description and the GVL standard Features text', async () => {
	const { container } = await renderList({
		...completeGVL,
		standardTexts: { features: 'Standard Features text from the GVL.' },
	});
	const standard = container.querySelector(
		`[data-testid="vendor-${vendorId}-features-standard-text"]`
	);
	expect(standard?.textContent?.trim()).toBe(
		'Standard Features text from the GVL.'
	);
	const features = standard?.parentElement;
	expect(features?.textContent).toContain(completeGVL.features[1]?.name);
	expect(features?.textContent).toContain(completeGVL.features[1]?.description);
	expect(features?.querySelector('[role="switch"], input, button')).toBeNull();
});

test('falls back to the translated Features text when the GVL has none', async () => {
	const { container } = await renderList({
		...completeGVL,
		standardTexts: undefined,
	});
	expect(
		container
			.querySelector(
				`[data-testid="vendor-${vendorId}-features-standard-text"]`
			)
			?.textContent?.trim()
	).toBe(getIABTranslations().preferenceCenter.features?.description);
});
