import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import {
	readThemeTokens,
	renderThemeTokens,
	themeTokenDestination,
} from './theme-token-reference';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the token reference matches ThemeCSSVariables', () => {
	expect(readFileSync(resolve(root, themeTokenDestination), 'utf8')).toBe(
		renderThemeTokens(root)
	);
});

test('reads each variable with its theme key and default', () => {
	const tokens = readThemeTokens(`export interface ThemeCSSVariables {
	/** \`radius.lg\` (default: \`0.75rem\`) */
	'--c15t-radius-lg'?: string;
}`);
	expect(tokens).toEqual([
		{ key: 'radius.lg', value: '`0.75rem`', variable: '--c15t-radius-lg' },
	]);
});

test('rejects a variable without a documented theme key', () => {
	expect(() =>
		readThemeTokens(`export interface ThemeCSSVariables {
	'--c15t-new'?: string;
}`)
	).toThrow('lack a `theme.key`');
});
