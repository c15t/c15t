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
		expect(isTranslations({ consentManagerDialog: {}, cookieBanner: {} })).toBe(
			false
		);
		expect(
			isTranslations({
				consentManagerDialog: {},
				consentTypes: {},
				cookieBanner: {},
			})
		).toBe(false);
	});

	test('returns true for object with all required keys', () => {
		expect(
			isTranslations({
				common: {},
				consentManagerDialog: {},
				consentTypes: {},
				cookieBanner: {},
			})
		).toBe(true);
	});

	test('returns true for object with additional keys', () => {
		expect(
			isTranslations({
				common: {},
				consentManagerDialog: {},
				consentTypes: {},
				cookieBanner: {},
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
				common: {},
				consentManagerDialog: { title: 'Dialog' },
				consentTypes: {},
				cookieBanner: { title: 'Default Title' },
			},
		},
	};

	test('returns translations for specified default language', () => {
		const config = {
			defaultLanguage: 'de',
			translations: {
				de: {
					common: {},
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					cookieBanner: { title: 'German Title' },
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as unknown
		);
		expect(result).toEqual(config.translations.de);
	});

	test('falls back to English when specified language not found', () => {
		const config = {
			defaultLanguage: 'fr',
			translations: {
				en: {
					common: {},
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					cookieBanner: { title: 'English Title' },
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as unknown
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
			mockDefaultTranslationConfig as unknown
		);
		expect(result).toEqual(mockDefaultTranslationConfig.translations.en);
	});

	test('uses en as default language when not specified', () => {
		const config = {
			translations: {
				en: {
					common: {},
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					cookieBanner: { title: 'English Title' },
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as unknown
		);
		expect(result).toEqual(config.translations.en);
	});

	test('handles empty config', () => {
		const result = resolveTranslations(
			{},
			mockDefaultTranslationConfig as unknown
		);
		expect(result).toEqual(mockDefaultTranslationConfig.translations.en);
	});

	test('ignores invalid translation objects', () => {
		const config = {
			defaultLanguage: 'de',
			translations: {
				// Missing required keys
				de: { incomplete: 'translation' },
				en: {
					common: {},
					consentManagerDialog: { title: 'Dialog' },
					consentTypes: {},
					cookieBanner: { title: 'English Title' },
				},
			},
		};
		const result = resolveTranslations(
			config,
			mockDefaultTranslationConfig as unknown
		);
		expect(result).toEqual(config.translations.en);
	});
});
