/** @vitest-environment jsdom */
import { mount } from '@vue/test-utils';
import { expect, test } from 'vitest';
import { ref } from 'vue';

import IabFeatureItem from '../runtime/components/iab-feature-item.vue';
import { symbolInit } from '../runtime/utils/symbols';

test('feature disclosure chevrons stay out of the accessibility tree', async () => {
	const wrapper = mount(IabFeatureItem, {
		global: { provide: { [symbolInit]: ref(undefined) } },
		props: {
			feature: {
				description: 'Combines information from different sources.',
				id: 1,
				illustrations: ['An advertiser combines information.'],
				name: 'Match and combine data',
				vendors: [{ id: 755, name: 'Vendor' }],
			},
		},
	});
	try {
		const trigger = wrapper.get('[id^="c15t-preference-item-trigger-"]');
		expect(trigger.get('svg').attributes('aria-hidden')).toBe('true');
		await trigger.trigger('click');
		const icons = wrapper.findAll('svg');
		expect(icons).toHaveLength(3);
		for (const icon of icons) {
			expect(icon.attributes('aria-hidden')).toBe('true');
		}
		expect(wrapper.find('[role="switch"]').exists()).toBe(false);
	} finally {
		wrapper.unmount();
	}
});
