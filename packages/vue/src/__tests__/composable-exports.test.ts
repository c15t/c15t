/**
 * The Nuxt module auto-imports the composables it reads from the index
 * source. A hand-written list used to miss composables added later
 * (`useHasConsentPolicy`, `useIabTranslations`, ...); reading the source
 * must find exactly what the index exports at runtime.
 */
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { readComposableExports } from '../composable-exports';
import * as composables from '../runtime/composables';

test('finds every composable the index exports', () => {
	const exported = Object.keys(composables)
		.filter((name) => /^use[A-Z]/u.test(name))
		.sort();

	expect(
		readComposableExports(join(__dirname, '../runtime/composables/index.ts'))
	).toEqual(exported);
	expect(exported).toEqual(
		expect.arrayContaining([
			'useHasConsentPolicy',
			'useHasConsentPreferences',
			'useHasConsentUi',
			'useIabTranslations',
		])
	);
});
