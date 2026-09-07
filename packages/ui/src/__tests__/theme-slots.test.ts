import bannerStyles from '@c15t/ui/styles/components/consent-banner';
import { describe, expect, expectTypeOf, test } from 'vitest';

import type { ComponentSlots, Theme } from '../theme/types';

describe('theme keys for banner rights and dismiss', () => {
	test('slots expose the rights group and right link', () => {
		expectTypeOf<ComponentSlots>().toHaveProperty('consentBannerRights');
		expectTypeOf<ComponentSlots>().toHaveProperty('consentBannerRightLink');
	});

	test('consentActions accepts a dismiss treatment', () => {
		expectTypeOf<NonNullable<Theme['consentActions']>>().toHaveProperty(
			'dismiss'
		);
	});

	test('built banner class map ships the rights classes', () => {
		expect(bannerStyles.rights).toMatch(/^c15t-ui-rights-/u);
		expect(bannerStyles.rightLink).toMatch(/^c15t-ui-rightLink-/u);
	});
});
