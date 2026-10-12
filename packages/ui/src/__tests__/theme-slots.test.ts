import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

describe('banner variant stylesheet', () => {
	const builtCss = readFileSync(
		join(import.meta.dirname, '../../dist/styles.css'),
		'utf-8'
	);

	test.each([
		"[data-variant='bar']",
		"[data-variant='widget']",
		"[data-variant='wall']",
		"[data-position='bottom-center']",
	])('built stylesheet targets %s', (selector) => {
		// Minified output may switch attribute quotes; accept either form.
		const unquoted = selector.replaceAll("'", '');
		expect(builtCss.includes(selector) || builtCss.includes(unquoted)).toBe(
			true
		);
	});
});
