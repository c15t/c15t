import * as expected from '@c15t/react/postcss-tailwind3';
import { describe, expect, test } from 'vitest';

import manifest from '../../package.json';
import * as entry from '../postcss-tailwind3';

describe('@c15t/nextjs/postcss-tailwind3', () => {
	test('re-exports the @c15t/react plugin from a built entry', () => {
		expect(manifest.exports['./postcss-tailwind3']).toEqual({
			default: './dist/postcss-tailwind3.js',
			import: './dist/postcss-tailwind3.js',
			types: './dist-types/postcss-tailwind3.d.ts',
		});

		expect(Object.keys(entry).sort()).toEqual(Object.keys(expected).sort());
		expect(entry.default).toBe(expected.default);
		expect(entry.postcss).toBe(expected.postcss);
		expect(entry.isC15tUiStylesheetPath).toBe(expected.isC15tUiStylesheetPath);
	});
});
