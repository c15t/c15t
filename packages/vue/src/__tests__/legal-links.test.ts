import legalLinkStyles from '@c15t/ui/styles/components/legal-links';
import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { ref } from 'vue';

import ConsentLegalLinks from '../runtime/components/legal-links.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { symbolInit } from '../runtime/utils/symbols';

const mountLinks = function mountLinks() {
	return mount(ConsentLegalLinks, {
		global: {
			provide: {
				[consentConfigKey as symbol]: {
					legalLinks: {
						cookiePolicy: { href: '/cookies' },
						privacyPolicy: { href: '/privacy', label: 'Privacy' },
					},
				} satisfies Partial<ConsentConfig>,
				[symbolInit as symbol]: ref({
					translations: {
						translations: { legalLinks: { cookiePolicy: 'Cookies' } },
					},
				}),
			},
		},
		props: { context: 'banner', links: ['privacyPolicy', 'cookiePolicy'] },
	});
};

describe('ConsentLegalLinks', () => {
	test('reads as a list after the description, as in React', () => {
		const wrapper = mountLinks();

		expect(wrapper.element.textContent).toBe(' Privacy, Cookies');
		expect(wrapper.element.getAttribute('class')).toBeNull();
		for (const link of wrapper.findAll('a')) {
			expect(link.classes()).toContain(legalLinkStyles.legalLink);
		}
	});
});
