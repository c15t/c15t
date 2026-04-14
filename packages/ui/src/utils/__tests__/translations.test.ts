import { describe, expect, test } from 'vitest';
import { isTranslations, resolveTranslations } from '../translations';

describe('isTranslations', () => {
	test('returns false for undefined', () => {
		expect(isTranslations(undefined)).toBe(false);
	});

	test('returns false for null', () => {
		expect(isTranslations(null)).toBe(false);
	});

	test('returns false for primitive values', () => {
		expect(isTranslations('string')).toBe(false);
		expect(isTranslations(123)).toBe(false);
		expect(isTranslations(true)).toBe(false);
	});

	test('returns false for empty object', () => {
		expect(isTranslations({})).toBe(false);
	});

	test('returns false for object missing required keys', () => {
		expect(isTranslations({ cookieBanner: {} })).toBe(false);
		expect(isTranslations({ cookieBanner: {}, consentManagerDialog: {} })).toBe(
			false
		);
		expect(
			isTranslations({
				cookieBanner: {},
				consentManagerDialog: {},
				consentTypes: {},
			})
		).toBe(false);
	});

	test('returns true for object with all required keys', () => {
		expect(
			isTranslations({
				cookieBanner: {},
				consentManagerDialog: {},
				consentTypes: {},
				common: {},
			})
		).toBe(true);
	});

	test('returns true for object with additional keys', () => {
		expect(
			isTranslations({
				cookieBanner: {},
				consentManagerDialog: {},
				consentTypes: {},
				common: {},
				extra: {},
			})
		).toBe(true);
	});
});

describe('resolveTranslations', () => {
	const mockDefaultTranslationConfig = {
		defaultLanguage: 'en',
		translations: {
			en: {
				cookieBanner: { title: 'Default Title' },
				consentManagerDialog: { title: 'Dialog' },
				consentTypes: {},
				common: {},
			},
		},
	};

	test('returns translations for specified default language', () => {
		const config = {
			defaultLanguage: 'de',
			translations: {
				de: {
					cookieBanner: { title: 'German Title' },
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					common: {},
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as any
		);
		expect(result).toEqual(config.translations.de);
	});

	test('falls back to English when specified language not found', () => {
		const config = {
			defaultLanguage: 'fr',
			translations: {
				en: {
					cookieBanner: { title: 'English Title' },
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					common: {},
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as any
		);
		expect(result).toEqual(config.translations.en);
	});

	test('falls back to default config English when no translations found', () => {
		const config = {
			defaultLanguage: 'fr',
			translations: {},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as any
		);
		expect(result).toEqual(mockDefaultTranslationConfig.translations.en);
	});

	test('uses en as default language when not specified', () => {
		const config = {
			translations: {
				en: {
					cookieBanner: { title: 'English Title' },
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					common: {},
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as any
		);
		expect(result).toEqual(config.translations.en);
	});

	test('handles empty config', () => {
		const result = resolveTranslations({}, mockDefaultTranslationConfig as any);
		expect(result).toEqual(mockDefaultTranslationConfig.translations.en);
	});

	test('ignores invalid translation objects', () => {
		const config = {
			defaultLanguage: 'de',
			translations: {
				de: { incomplete: 'translation' }, // Missing required keys
				en: {
					cookieBanner: { title: 'English Title' },
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					common: {},
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as any
		);
		expect(result).toEqual(config.translations.en);
	});
});
