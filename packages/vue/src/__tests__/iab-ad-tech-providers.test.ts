/**
 * The Vue vendor list discloses Google Additional Consent providers: name,
 * privacy policy and a consent switch that emits the provider ID.
 *
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { ref } from 'vue';

import IabVendorList from '../runtime/components/iab-vendor-list.vue';
import { symbolInit } from '../runtime/utils/symbols';

const global = { provide: { [symbolInit]: ref(undefined) } };
const adTechProviders = [
	{ id: 89, name: 'Example Ad Tech', policyUrl: 'https://ads.example/privacy' },
	{ id: 2577, name: 'Other Ad Tech', policyUrl: 'https://other.example/p' },
];

test('lists each provider with its privacy policy and a consent switch', async () => {
	const wrapper = mount(IabVendorList, {
		global,
		props: {
			adTechProviderConsents: { '2577': true },
			adTechProviders,
			purposes: [],
			selectedVendorId: null,
			vendorConsents: {},
			vendorData: null,
		},
	});
	const row = wrapper.get('#ad-tech-provider-89');
	expect(row.text()).toContain('Example Ad Tech');
	expect(row.get('a').attributes('href')).toBe('https://ads.example/privacy');
	expect(
		wrapper.get('#ad-tech-provider-2577 [role="switch"]').attributes()
	).toMatchObject({ 'aria-checked': 'true' });

	await row.get('[role="switch"]').trigger('click');
	expect(wrapper.emitted('adTechProviderToggle')).toEqual([[89, true]]);
});

test('hides providers while a vendor from the Purposes tab is selected', () => {
	const wrapper = mount(IabVendorList, {
		global,
		props: {
			adTechProviders,
			purposes: [],
			selectedVendorId: 755,
			vendorConsents: {},
			vendorData: null,
		},
	});
	expect(wrapper.find('#ad-tech-provider-89').exists()).toBe(false);
});
