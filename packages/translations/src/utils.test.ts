import { beforeEach, describe, expect, it } from 'vitest';

import { baseTranslations as bundledTranslations } from './translations';
import type { I18nConfig, TranslationConfig, Translations } from './types';
import {
	deepMergeTranslations,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	normalizeI18nConfig,
	parseAcceptLanguage,
	prepareTranslationConfig,
	selectLanguage,
	toTranslationConfig,
} from './utils';

describe('bundled frame translations', () => {
	it.each(Object.entries(bundledTranslations))(
		'%s defines loading and error copy',
		(_language, translations) => {
			expect(translations.frame.loading).toEqual(expect.any(String));
			expect(translations.frame.loading).not.toBe('');
			expect(translations.frame.error).toEqual(expect.any(String));
			expect(translations.frame.error).not.toBe('');
		}
	);
});

describe('deepMergeTranslations', () => {
	const baseTranslations: Translations = {
		common: {
			acceptAll: 'Default Accept All',
			customize: 'Default Customize',
			rejectAll: 'Default Reject All',
			save: 'Default Save',
		},
		consentManagerDialog: {
			title: 'Dialog Title',
		},
		consentTypes: {
			necessary: {
				description: 'These cookies are required',
				title: 'Necessary',
			},
		},
		cookieBanner: {
			description: 'Base Description',
			title: 'Base Title',
		},
		frame: {
			actionButton: 'Frame Button',
			error: 'Content failed',
			loading: 'Loading content',
			title: 'Frame Title',
		},
	};

	it('should merge translations with override taking priority', () => {
		const override: Partial<Translations> = {
			consentManagerDialog: {
				description: 'Custom Dialog Description',
			},
			cookieBanner: {
				title: 'Custom Title',
			},
		};

		const result = deepMergeTranslations(baseTranslations, override);

		expect(result).toEqual({
			common: {
				acceptAll: 'Default Accept All',
				customize: 'Default Customize',
				rejectAll: 'Default Reject All',
				save: 'Default Save',
			},
			consentManagerDialog: {
				description: 'Custom Dialog Description',
				title: 'Dialog Title',
			},
			consentTypes: {
				necessary: {
					description: 'These cookies are required',
					title: 'Necessary',
				},
			},
			cookieBanner: {
				description: 'Base Description',
				title: 'Custom Title',
			},
			frame: {
				actionButton: 'Frame Button',
				error: 'Content failed',
				loading: 'Loading content',
				title: 'Frame Title',
			},
		});
	});

	it('should handle empty override object', () => {
		const result = deepMergeTranslations(baseTranslations, {});
		expect(result).toEqual(baseTranslations);
	});
});

describe('mergeTranslationConfigs', () => {
	const defaultConfig: TranslationConfig = {
		defaultLanguage: 'en',
		translations: {
			de: {
				common: {
					acceptAll: 'German Accept All',
					customize: 'German Customize',
					rejectAll: 'German Reject All',
					save: 'German Save',
				},
				consentManagerDialog: {
					title: 'German Dialog',
				},
				consentTypes: {
					necessary: {
						description: 'Diese Cookies sind erforderlich',
						title: 'Notwendig',
					},
				},
				cookieBanner: {
					description: 'German Description',
					title: 'German Title',
				},
			},
			en: {
				common: {
					acceptAll: 'Default Accept All',
					customize: 'Default Customize',
					rejectAll: 'Default Reject All',
					save: 'Default Save',
				},
				consentManagerDialog: {
					title: 'Default Dialog',
				},
				consentTypes: {
					necessary: {
						description: 'These cookies are required',
						title: 'Necessary',
					},
				},
				cookieBanner: {
					description: 'Default Description',
					title: 'Default Title',
				},
			},
		},
	};

	it('should merge configs with custom taking priority', () => {
		const customConfig: Partial<TranslationConfig> = {
			defaultLanguage: 'de',
			translations: {
				en: {
					cookieBanner: {
						title: 'Custom Title',
					},
				},
			},
		};

		const result = mergeTranslationConfigs(defaultConfig, customConfig);
		const enTranslations = result.translations.en;
		const deTranslations = result.translations.de;

		expect(result.defaultLanguage).toBe('de');
		expect(enTranslations?.cookieBanner?.title).toBe('Custom Title');
		expect(enTranslations?.cookieBanner?.description).toBe(
			'Default Description'
		);
		// German translations should now be complete with English fallbacks
		expect(deTranslations?.consentManagerDialog?.description).toBe(
			'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.'
		);
		expect(deTranslations?.consentTypes?.experience?.title).toBe('Experience');
		expect(deTranslations?.frame?.title).toBe(
			'Accept {category} consent to view this content.'
		);
	});

	it('should handle undefined custom config', () => {
		const result = mergeTranslationConfigs(defaultConfig);
		// Should return complete translations with English fallbacks
		expect(result.defaultLanguage).toBe(defaultConfig.defaultLanguage);
		expect(result.translations.en?.consentManagerDialog?.description).toBe(
			'Customize your privacy settings here. You can choose which types of cookies and tracking technologies you allow.'
		);
		expect(result.translations.de?.consentTypes?.experience?.title).toBe(
			'Experience'
		);
		expect(result.translations.de?.frame?.title).toBe(
			'Accept {category} consent to view this content.'
		);
	});

	it('should prioritize i18n over legacy fields when both are present', () => {
		const result = mergeTranslationConfigs(
			{
				defaultLanguage: 'en',
				i18n: {
					detectBrowserLanguage: false,
					locale: 'fr',
					messages: {
						fr: {
							cookieBanner: {
								title: 'Titre',
							},
						},
					},
				},
				translations: defaultConfig.translations,
			},
			{
				defaultLanguage: 'de',
				translations: {
					de: {
						cookieBanner: {
							title: 'Titel',
						},
					},
				},
			}
		);

		expect(result.defaultLanguage).toBe('de');
		expect(result.translations.fr?.cookieBanner?.title).toBe('Titre');
	});
});

describe('detectBrowserLanguage', () => {
	const mockNavigator = {
		language: 'en-US',
	};

	beforeEach(() => {
		Object.defineProperty(window, 'navigator', {
			configurable: true,
			value: mockNavigator,
		});
	});

	it('should return default language when auto-switch is disabled', () => {
		const result = detectBrowserLanguage({ de: {}, en: {} }, 'de', true);
		expect(result).toBe('de');
	});

	it('should return en when no default language is provided and auto-switch is disabled', () => {
		const result = detectBrowserLanguage({ de: {}, en: {} }, undefined, true);
		expect(result).toBe('en');
	});

	it('should detect browser language when available', () => {
		mockNavigator.language = 'de-DE';
		const result = detectBrowserLanguage({ de: {}, en: {} }, 'en', false);
		expect(result).toBe('de');
	});

	it('should fall back to default language when browser language not available', () => {
		mockNavigator.language = 'fr-FR';
		const result = detectBrowserLanguage({ de: {}, en: {} }, 'en', false);
		expect(result).toBe('en');
	});
});

describe('parseAcceptLanguage', () => {
	it('should return empty array when header is null or empty', () => {
		expect(parseAcceptLanguage(null)).toEqual([]);
		expect(parseAcceptLanguage(undefined)).toEqual([]);
		expect(parseAcceptLanguage('')).toEqual([]);
	});

	it('should parse single language without region', () => {
		expect(parseAcceptLanguage('de')).toEqual(['de']);
	});

	it('should normalize region codes and lowercase', () => {
		expect(parseAcceptLanguage('DE-de')).toEqual(['de']);
		expect(parseAcceptLanguage('en-US')).toEqual(['en']);
	});

	it('should parse multiple languages in order', () => {
		expect(parseAcceptLanguage('de-DE,en;q=0.9,fr;q=0.8')).toEqual([
			'de',
			'en',
			'fr',
		]);
	});

	it('should order by quality values', () => {
		expect(parseAcceptLanguage('en;q=0.1,de;q=0.9')).toEqual(['de', 'en']);
	});
});

describe('selectLanguage', () => {
	it('should return fallback when no available languages', () => {
		expect(selectLanguage([], { fallback: 'en', header: 'de' })).toBe('en');
	});

	it('should return first matching language from header', () => {
		const available = ['en', 'de'];
		expect(
			selectLanguage(available, {
				fallback: 'en',
				header: 'de-DE,en;q=0.9',
			})
		).toBe('de');
	});

	it('should fall back when header languages are unsupported', () => {
		const available = ['en', 'de'];
		expect(
			selectLanguage(available, {
				fallback: 'en',
				header: 'xx-XX,yy;q=0.9',
			})
		).toBe('en');
	});

	it('should prefer second header language if first is unsupported but second is available', () => {
		const available = ['en', 'de'];
		expect(
			selectLanguage(available, {
				fallback: 'de',
				header: 'xx-XX,en;q=0.9,de;q=0.8',
			})
		).toBe('en');
	});

	it('should default fallback to "en" when not provided', () => {
		const available = ['de'];
		expect(selectLanguage(available, { header: 'xx-XX' })).toBe('en');
	});
});

describe('i18n normalization', () => {
	it('should map legacy translation config into i18n shape', () => {
		const normalized = normalizeI18nConfig({
			defaultLanguage: 'en',
			disableAutoLanguageSwitch: true,
			translations: { en: { common: { acceptAll: 'Accept' } } },
		});

		expect(normalized).toEqual({
			detectBrowserLanguage: false,
			locale: 'en',
			messages: { en: { common: { acceptAll: 'Accept' } } },
		});
	});

	it('should prefer i18n values when both i18n and legacy values are provided', () => {
		const normalized = normalizeI18nConfig({
			defaultLanguage: 'en',
			i18n: {
				detectBrowserLanguage: true,
				locale: 'de',
				messages: { de: { common: { acceptAll: 'Neu' } } },
			},
			translations: { en: { common: { acceptAll: 'Legacy' } } },
		});

		expect(normalized).toEqual({
			detectBrowserLanguage: true,
			locale: 'de',
			messages: { de: { common: { acceptAll: 'Neu' } } },
		});
	});

	it('should map canonical i18n shape back to legacy translation config', () => {
		const config: I18nConfig = {
			detectBrowserLanguage: true,
			locale: 'en',
			messages: { en: { common: { acceptAll: 'Accept' } } },
		};

		expect(toTranslationConfig(config)).toEqual({
			defaultLanguage: 'en',
			disableAutoLanguageSwitch: false,
			translations: { en: { common: { acceptAll: 'Accept' } } },
		});
	});
});

describe('prepareTranslationConfig', () => {
	const defaultConfig: TranslationConfig = {
		defaultLanguage: 'en',
		translations: {
			de: {
				cookieBanner: {
					title: 'German Title',
				},
			},
			en: {
				cookieBanner: {
					title: 'Default Title',
				},
			},
		},
	};

	const mockNavigator = {
		language: 'de-DE',
	};

	beforeEach(() => {
		Object.defineProperty(window, 'navigator', {
			configurable: true,
			value: mockNavigator,
		});
	});

	it('should prepare config with detected language', () => {
		const result = prepareTranslationConfig(defaultConfig);
		expect(result.defaultLanguage).toBe('de');
	});

	it('should respect custom config settings', () => {
		const customConfig: Partial<TranslationConfig> = {
			defaultLanguage: 'en',
			disableAutoLanguageSwitch: true,
			translations: {
				en: {
					cookieBanner: {
						title: 'Custom Title',
					},
				},
			},
		};

		const result = prepareTranslationConfig(defaultConfig, customConfig);
		expect(result.defaultLanguage).toBe('en');
		expect(result.translations.en?.cookieBanner?.title).toBe('Custom Title');
	});
});
