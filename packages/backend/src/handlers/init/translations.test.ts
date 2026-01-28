import { baseTranslations } from '@c15t/translations';
import { describe, expect, it } from 'vitest';
import { getTranslationsData } from './translations';

describe('showBanner > getTranslationsData', () => {
	it("should return 'en' translations when Accept-Language is null", () => {
		const { translations, language } = getTranslationsData(null);
		expect(language).toBe('en');
		expect(translations.cookieBanner.title).toBe(
			baseTranslations.en.cookieBanner.title
		);
	});

	it("should return 'en' translations for unsupported language", () => {
		const { translations, language } = getTranslationsData('xx-XX,en;q=0.9');
		expect(language).toBe('en');
		expect(translations.cookieBanner.title).toBe(
			baseTranslations.en.cookieBanner.title
		);
	});

	it("should return 'de' translations for 'de-DE'", () => {
		const { translations, language } = getTranslationsData(
			'de-DE,de;q=0.9,en;q=0.8'
		);
		expect(language).toBe('de');
		expect(translations.cookieBanner.title).toBe(
			baseTranslations.de.cookieBanner.title
		);
	});

	it('should merge custom translations for the preferred language', () => {
		const customTranslations = {
			en: {
				cookieBanner: {
					title: 'My Custom Cookie Title',
				},
			},
		};
		const { translations, language } = getTranslationsData(
			'en-US,en;q=0.9',
			customTranslations
		);
		expect(language).toBe('en');
		expect(translations.cookieBanner.title).toBe('My Custom Cookie Title');
		// Check if other properties from base translations are still there
		expect(translations.cookieBanner.description).toBeDefined();
	});

	it('should not merge custom translations for a different language', () => {
		const customTranslations = {
			de: {
				cookieBanner: {
					title: 'Meine benutzerdefinierte Cookie-Überschrift',
				},
			},
		};
		const { translations, language } = getTranslationsData(
			'en-US,en;q=0.9',
			customTranslations
		);
		expect(language).toBe('en');
		expect(translations.cookieBanner.title).toBe(
			baseTranslations.en.cookieBanner.title
		);
	});

	it('should handle partially provided custom translations', () => {
		const customTranslations = {
			en: {
				cookieBanner: {
					// Title is NOT provided, description is.
					description: 'My custom description.',
				},
			},
		};
		const { translations, language } = getTranslationsData(
			'en-US,en;q=0.9',
			customTranslations
		);
		expect(language).toBe('en');
		// Title should come from base
		expect(translations.cookieBanner.title).toBe(
			baseTranslations.en.cookieBanner.title
		);
		// Description should be from custom
		expect(translations.cookieBanner.description).toBe(
			'My custom description.'
		);
	});

	it('should return base translations if custom translations are empty for the language', () => {
		const customTranslations = {
			de: {},
		};
		const { translations, language } = getTranslationsData(
			'de-DE,de;q=0.9',
			customTranslations
		);
		expect(language).toBe('de');
		expect(translations.cookieBanner.title).toBe(
			baseTranslations.de.cookieBanner.title
		);
	});

	it('should return custom translations for unsupported base language', () => {
		const { translations, language } = getTranslationsData('xx-XX,en;q=0.9', {
			xx: {
				cookieBanner: {
					title: 'XX Title',
				},
			},
		});

		expect(language).toBe('xx');
		expect(translations.cookieBanner.title).toBe('XX Title');
		expect(translations.cookieBanner.description).toBe(
			baseTranslations.en.cookieBanner.description
		);
	});
});
