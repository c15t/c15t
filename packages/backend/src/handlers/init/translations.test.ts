import { baseTranslations } from '@c15t/translations/all';
import { describe, expect, it } from 'vitest';
import {
	getTranslationsData,
	listProfiles,
	validateMessages,
} from './translations';

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

	it('should stay within configured custom languages when the browser language is unavailable', () => {
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
		expect(language).toBe('de');
		expect(translations.cookieBanner.title).toBe(
			'Meine benutzerdefinierte Cookie-Überschrift'
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

	it('should resolve profile+language before fallback chain', () => {
		const { language, translations } = getTranslationsData(null, undefined, {
			i18n: {
				messages: {
					default: {
						en: { cookieBanner: { title: 'Default EN Title' } },
					},
					us_ca: {
						en: { cookieBanner: { title: 'CA EN Title' } },
						de: { cookieBanner: { title: 'CA DE Title' } },
					},
				},
			},
			policyI18n: {
				messageProfile: 'us_ca',
				language: 'de',
			},
		});

		expect(language).toBe('de');
		expect(translations.cookieBanner.title).toBe('CA DE Title');
	});

	it('should fallback from profile+language to profile+en', () => {
		const { language, translations } = getTranslationsData(null, undefined, {
			i18n: {
				messages: {
					default: {
						en: { cookieBanner: { title: 'Default EN Title' } },
					},
					us_fl: {
						en: { cookieBanner: { title: 'FL EN Title' } },
					},
				},
			},
			policyI18n: {
				messageProfile: 'us_fl',
				language: 'fr',
			},
		});

		expect(language).toBe('en');
		expect(translations.cookieBanner.title).toBe('FL EN Title');
	});

	it('should keep policy language selection within configured profile languages', () => {
		const { language, translations } = getTranslationsData(
			'zh-CN,zh;q=0.9',
			undefined,
			{
				i18n: {
					messages: {
						default: {
							en: { cookieBanner: { title: 'Default EN Title' } },
							es: { cookieBanner: { title: 'Default ES Title' } },
						},
						eu: {
							en: { cookieBanner: { title: 'EU EN Title' } },
							fr: { cookieBanner: { title: 'EU FR Title' } },
						},
					},
				},
				policyI18n: {
					messageProfile: 'eu',
				},
			}
		);

		expect(language).toBe('en');
		expect(translations.cookieBanner.title).toBe('EU EN Title');
	});

	it('should not expand a policy profile with default profile languages', () => {
		const { language, translations } = getTranslationsData(
			'es-ES,es;q=0.9',
			undefined,
			{
				i18n: {
					messages: {
						default: {
							en: { cookieBanner: { title: 'Default EN Title' } },
							es: { cookieBanner: { title: 'Default ES Title' } },
						},
						eu: {
							en: { cookieBanner: { title: 'EU EN Title' } },
							fr: { cookieBanner: { title: 'EU FR Title' } },
						},
					},
				},
				policyI18n: {
					messageProfile: 'eu',
				},
			}
		);

		expect(language).toBe('en');
		expect(translations.cookieBanner.title).toBe('EU EN Title');
	});

	it('should use fallbackLanguage within the active profile', () => {
		const { language, translations } = getTranslationsData(
			'zh-CN,zh;q=0.9',
			undefined,
			{
				i18n: {
					fallbackLanguage: 'fr',
					messages: {
						default: {
							en: { cookieBanner: { title: 'Default EN Title' } },
						},
						eu: {
							en: { cookieBanner: { title: 'EU EN Title' } },
							fr: { cookieBanner: { title: 'EU FR Title' } },
						},
					},
				},
				policyI18n: {
					messageProfile: 'eu',
				},
			}
		);

		expect(language).toBe('fr');
		expect(translations.cookieBanner.title).toBe('EU FR Title');
	});

	it('should fallback to default profile language when profile is missing', () => {
		const { language, translations } = getTranslationsData(null, undefined, {
			i18n: {
				messages: {
					default: {
						de: { cookieBanner: { title: 'Default DE Title' } },
						en: { cookieBanner: { title: 'Default EN Title' } },
					},
				},
			},
			policyI18n: {
				messageProfile: 'missing',
				language: 'de',
			},
		});

		expect(language).toBe('de');
		expect(translations.cookieBanner.title).toBe('Default DE Title');
	});

	it('should list configured profiles', () => {
		const profiles = listProfiles({
			i18n: {
				messages: {
					us_ca: { en: {} },
					default: { en: {} },
				},
			},
		});

		expect(profiles).toEqual(['default', 'us_ca']);
	});

	it('should validate policy i18n profile references', () => {
		const result = validateMessages({
			i18n: {
				messages: {
					default: { en: {} },
				},
			},
			policies: [
				{
					id: 'policy_missing_profile',
					match: { isDefault: true },
					i18n: { messageProfile: 'does_not_exist', language: 'en' },
				},
			],
		});

		expect(result.errors[0]).toContain(
			"references missing i18n profile 'does_not_exist'"
		);
	});
});
