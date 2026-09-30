import { describe, expect, it } from 'vitest';

import { baseTranslations } from './all';
import { getStockTranslations, registerStockTranslations } from './stock';
import { translations as enTranslations } from './translations/en';

describe('stock translations registry', () => {
	it('always knows English', () => {
		expect(getStockTranslations('en')).toBe(enTranslations);
	});

	it('knows every bundled language once /all has loaded', () => {
		expect(getStockTranslations('de')).toBe(baseTranslations.de);
		expect(getStockTranslations('zh')).toBe(baseTranslations.zh);
	});

	it('returns undefined for a language nothing registered', () => {
		expect(getStockTranslations('tlh')).toBeUndefined();
		registerStockTranslations({ tlh: enTranslations });
		expect(getStockTranslations('tlh')).toBe(enTranslations);
	});
});
