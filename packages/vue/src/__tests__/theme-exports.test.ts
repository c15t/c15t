import type { Theme as NuxtTheme } from '@c15t/vue';
import { defineTheme as defineNuxtTheme } from '@c15t/vue';
import { expect, test } from 'vitest';

import type { Theme } from '../index';
import { defineTheme } from '../index';

test('defines a theme through the Vue plugin entry', () => {
	const theme = {
		colors: { primary: '#2f6f4e' },
	} satisfies Theme;

	expect(defineTheme(theme)).toBe(theme);
});

test('defines a theme through the published Nuxt entry', () => {
	const theme = {
		colors: { primary: '#2f6f4e' },
	} satisfies NuxtTheme;
	expect(defineNuxtTheme(theme)).toBe(theme);
});
