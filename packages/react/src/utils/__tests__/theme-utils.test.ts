import { generateThemeCSS as uiGenerateThemeCSS } from '@c15t/ui/theme';
import { describe, expect, test } from 'vitest';

import { generateThemeCSS } from '../theme-utils';

const theme = { dark: { primary: '#40e0d0' } };

describe('generateThemeCSS from @c15t/react/utils', () => {
	test.each(['light', 'dark', 'system', null, undefined] as const)(
		'writes the same CSS as @c15t/ui/theme for colorScheme %s',
		(colorScheme) => {
			expect(generateThemeCSS(theme, colorScheme)).toBe(
				uiGenerateThemeCSS(theme, colorScheme)
			);
		}
	);

	test('system switches to the dark tokens by media query', () => {
		expect(generateThemeCSS(theme, 'system')).toContain(
			'@media(prefers-color-scheme:dark)'
		);
	});
});
