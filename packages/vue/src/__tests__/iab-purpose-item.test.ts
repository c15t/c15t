/**
 * A purpose row whose vendors all use legitimate interest has nothing a
 * consent switch could turn off. Showing one reads as an opt-out while
 * every vendor keeps processing, so the row offers only the objection.
 *
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { ref } from 'vue';

import IabPurposeItem from '../runtime/components/iab-purpose-item.vue';
import IabStackItem from '../runtime/components/iab-stack-item.vue';
import { symbolInit } from '../runtime/utils/symbols';

const purpose = (hasConsentBasis: boolean) => ({
	description: '',
	hasConsentBasis,
	id: 7,
	illustrations: [],
	name: 'Measure advertising performance',
	vendors: [{ id: 755, name: 'Vendor', usesLegitimateInterest: true }],
});

const global = { provide: { [symbolInit]: ref(undefined) } };

describe('IAB purpose row consent switch', () => {
	test.each([
		[true, 1],
		[false, 0],
	])(
		'hasConsentBasis %s renders %i switches',
		async (hasConsentBasis, count) => {
			const wrapper = mount(IabPurposeItem, {
				global,
				props: {
					isEnabled: true,
					purpose: purpose(hasConsentBasis),
					vendorConsents: {},
				},
			});
			expect(
				wrapper.findAll(
					'[role="switch"][aria-label="Measure advertising performance"]'
				)
			).toHaveLength(count);
			// The objection control is there either way, in the row's content,
			// which mounts when the row first opens.
			await wrapper
				.get('[id^="c15t-preference-item-trigger-"]')
				.trigger('click');
			expect(wrapper.find('button[aria-pressed]').exists()).toBe(true);
		}
	);

	test('a stack of legitimate-interest-only purposes has no consent switch', () => {
		const wrapper = mount(IabStackItem, {
			global,
			props: {
				consents: {},
				stack: {
					description: '',
					id: 1,
					name: 'Advertising',
					purposes: [purpose(false)],
				},
				vendorConsents: {},
			},
		});
		expect(
			wrapper.findAll('[role="switch"][aria-label="Advertising"]')
		).toHaveLength(0);
	});
});
