/**
 * The Svelte vendor list discloses Google Additional Consent providers:
 * name, privacy policy and a consent switch that reports the provider ID.
 */
import { fireEvent, render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';

import IABVendorList from '../lib/components/iab-vendor-list.svelte';
import { getIABTranslations } from '../lib/iab-translations';

test('lists each provider with its privacy policy and a consent switch', async () => {
	const onAdTechProviderToggle = vi.fn();
	const { container } = render(IABVendorList, {
		adTechProviderConsents: { '2577': true },
		adTechProviders: [
			{
				id: 89,
				name: 'Example Ad Tech',
				policyUrl: 'https://ads.example/privacy',
			},
			{ id: 2577, name: 'Other Ad Tech', policyUrl: 'https://other.example/p' },
		],
		iabT: getIABTranslations(),
		onAdTechProviderToggle,
		onClearSelection: vi.fn(),
		onVendorToggle: vi.fn(),
		purposes: [],
		selectedVendorId: null,
		vendorConsents: {},
		vendorData: null,
	});
	const row = container.querySelector('#ad-tech-provider-89');
	expect(row?.textContent).toContain('Example Ad Tech');
	expect(row?.querySelector('a')?.getAttribute('href')).toBe(
		'https://ads.example/privacy'
	);
	expect(container.textContent).toContain('Google Ad Tech Providers');
	expect(
		container
			.querySelector('#ad-tech-provider-2577 [role="switch"]')
			?.getAttribute('aria-checked')
	).toBe('true');

	const providerSwitch = row?.querySelector('[role="switch"]');
	if (!providerSwitch) {
		throw new Error('Missing provider switch');
	}
	await fireEvent.click(providerSwitch);
	expect(onAdTechProviderToggle).toHaveBeenCalledWith(89, true);
});
