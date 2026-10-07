import { describe, expect, it } from 'vitest';

import manifest from '../package.json';
import { getStockTranslations } from './stock';
import { baseTranslations } from './translations';

const languages = Object.keys(baseTranslations).filter(
	(language) => language !== 'en'
);

const exportsMap: Record<string, { import?: string } | undefined> =
	manifest.exports;

describe('per-language entry points', () => {
	it('registers only the language it is imported for', async () => {
		expect(getStockTranslations('de')).toBeUndefined();
		expect(getStockTranslations('fr')).toBeUndefined();

		const german = await import('./languages/de');

		expect(german.translations).toBe(baseTranslations.de);
		expect(getStockTranslations('de')).toBe(baseTranslations.de);
		expect(getStockTranslations('fr')).toBeUndefined();
	});

	it.each(languages)('`./%s` exports and registers its copy', async (code) => {
		const entry = await import(`./languages/${code}.ts`);

		expect(entry.translations).toBe(
			baseTranslations[code as keyof typeof baseTranslations]
		);
		expect(getStockTranslations(code)).toBe(entry.translations);
	});

	it.each(languages)(
		'`./%s` is published as a side effect, so a bare import registers',
		(code) => {
			const target = exportsMap[`./${code}`]?.import;
			const sideEffects: boolean | string[] = manifest.sideEffects;

			expect(target).toBe(`./dist/languages/${code}.js`);
			expect(sideEffects).toContain('./dist/languages/*.js');
		}
	);
});
