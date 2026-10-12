import { expect, test } from 'vitest';

import { defineTheme } from '../types';

test('defineTheme preserves object identity', () => {
	const theme = { colors: { primary: 'red' } };
	expect(defineTheme(theme)).toBe(theme);
});
