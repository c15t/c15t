import type { ConsentLegalLinkKey } from '@c15t/schema/config';
import legalLinkStyles from '@c15t/ui/styles/components/legal-links';
import { mount } from '@vue/test-utils';
import { describe, expect, test } from 'vitest';
import { ref } from 'vue';

import ConsentLegalLinks from '../runtime/components/legal-links.vue';
import ConsentLink from '../runtime/components/link.vue';
import { consentConfigKey } from '../runtime/composables/config';
import type { ConsentConfig } from '../runtime/config';
import { symbolInit } from '../runtime/utils/symbols';

const global = {
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
};

const mountLinks = function mountLinks(
	links: ConsentLegalLinkKey[] = ['privacyPolicy', 'cookiePolicy']
) {
	return mount(ConsentLegalLinks, {
		global,
		props: { context: 'banner', links },
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

	test('skips a listed link the config gives no href', () => {
		const wrapper = mountLinks([
			'privacyPolicy',
			'cookiePolicy',
			'termsOfService',
		]);

		expect(wrapper.findAll('a').map((link) => link.attributes('href'))).toEqual(
			['/privacy', '/cookies']
		);
		expect(wrapper.element.textContent).toBe(' Privacy, Cookies');
	});
});

describe('ConsentLink', () => {
	test('links to an href passed to it when the config has none', () => {
		const wrapper = mount(ConsentLink, {
			global,
			props: { context: 'banner', href: '/terms', link: 'termsOfService' },
		});

		expect(wrapper.find('a').attributes('href')).toBe('/terms');
	});

	test('follows a passed href that arrives or changes after mount', async () => {
		const wrapper = mount(ConsentLink, {
			global,
			props: { context: 'banner', link: 'termsOfService' },
		});
		expect(wrapper.find('a').exists()).toBe(false);

		await wrapper.setProps({ href: '/terms' });
		expect(wrapper.find('a').attributes('href')).toBe('/terms');

		await wrapper.setProps({ href: '/terms-2' });
		expect(wrapper.find('a').attributes('href')).toBe('/terms-2');
	});

	test('a passed href wins over the config', () => {
		const wrapper = mount(ConsentLink, {
			global,
			props: { context: 'banner', href: '/other', link: 'cookiePolicy' },
		});

		expect(wrapper.find('a').attributes('href')).toBe('/other');
	});

	test('renders nothing for a link with no href anywhere', () => {
		const wrapper = mount(ConsentLink, {
			global,
			props: { context: 'banner', link: 'termsOfService' },
		});

		expect(wrapper.find('a').exists()).toBe(false);
	});

	test('adds rel="noopener noreferrer" when target is _blank without rel', () => {
		const wrapper = mount(ConsentLink, {
			global: {
				provide: {
					[consentConfigKey as symbol]: {
						legalLinks: {
							privacyPolicy: {
								href: '/privacy',
								label: 'Privacy',
								target: '_blank',
							},
						},
					} satisfies Partial<ConsentConfig>,
					[symbolInit as symbol]: ref({}),
				},
			},
			props: { context: 'banner', link: 'privacyPolicy' },
		});

		expect(wrapper.find('a').attributes('target')).toBe('_blank');
		expect(wrapper.find('a').attributes('rel')).toBe('noopener noreferrer');
	});

	test('keeps explicit rel and omits rel when target is not _blank', () => {
		const explicitRel = mount(ConsentLink, {
			global: {
				provide: {
					[consentConfigKey as symbol]: {
						legalLinks: {
							privacyPolicy: {
								href: '/privacy',
								rel: 'noopener',
								target: '_blank',
							},
						},
					} satisfies Partial<ConsentConfig>,
					[symbolInit as symbol]: ref({}),
				},
			},
			props: { context: 'banner', link: 'privacyPolicy' },
		});
		expect(explicitRel.find('a').attributes('rel')).toBe('noopener');

		const sameTab = mount(ConsentLink, {
			global: {
				provide: {
					[consentConfigKey as symbol]: {
						legalLinks: {
							privacyPolicy: { href: '/privacy', target: '_self' },
						},
					} satisfies Partial<ConsentConfig>,
					[symbolInit as symbol]: ref({}),
				},
			},
			props: { context: 'banner', link: 'privacyPolicy' },
		});
		expect(sameTab.find('a').attributes('target')).toBe('_self');
		expect(sameTab.find('a').attributes('rel')).toBeUndefined();
	});
});
