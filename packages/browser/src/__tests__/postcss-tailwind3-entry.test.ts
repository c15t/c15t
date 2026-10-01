import * as expected from '@c15t/ui/postcss-tailwind3';
import { describe, expect, test } from 'vitest';

import manifest from '../../package.json';
import * as entry from '../postcss-tailwind3';

describe('@c15t/browser/postcss-tailwind3', () => {
	test('re-exports the @c15t/ui plugin from a built entry', () => {
		expect(manifest.exports['./postcss-tailwind3']).toEqual({
			default: './dist/postcss-tailwind3.js',
			import: './dist/postcss-tailwind3.js',
			types: './dist-types/postcss-tailwind3.d.ts',
		});

		expect(Object.keys(expected)).toEqual(
			expect.arrayContaining(['default', 'postcss'])
		);
		// Compare whole namespaces: lint resolves `@c15t/ui/postcss-tailwind3`
		// only after a build, so reading `entry.postcss` fails on an unbuilt tree.
		expect({ ...entry }).toStrictEqual({ ...expected });
	});
});
