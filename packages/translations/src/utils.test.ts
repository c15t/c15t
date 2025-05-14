import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TranslationConfig, Translations } from './types';
import {
	deepMergeTranslations,
	detectBrowserLanguage,
	mergeTranslationConfigs,
	prepareTranslationConfig,
} from './utils';

describe('deepMergeTranslations', () => {
	const baseTranslations: Translations = {
		common: {
			acceptAll: 'Default Accept All',
			rejectAll: 'Default Reject All',
			customize: 'Default Customize',
			save: 'Default Save',
		},
		cookieBanner: {
			title: 'Base Title',
			description: 'Base Description',
		},
		consentManagerDialog: {
			title: 'Dialog Title',
		},
		consentTypes: {
			necessary: {
				title: 'Necessary',
				description: 'These cookies are required',
			},
		},
	};

	it('should merge translations with override taking priority', () => {
		const override: Partial<Translations> = {
			cookieBanner: {
				title: 'Custom Title',
			},
			consentManagerDialog: {
				description: 'Custom Dialog Description',
			},
		};

		const result = deepMergeTranslations(baseTranslations, override);

		expect(result).toEqual({
			cookieBanner: {
				title: 'Custom Title',
				description: 'Base Description',
			},
			consentManagerDialog: {
				title: 'Dialog Title',
				description: 'Custom Dialog Description',
			},
			consentManagerWidget: {
				title: 'Widget Title',
			},
			consentTypes: {
				necessary: {
					title: 'Necessary',
					description: 'These cookies are required',
				},
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
		translations: {
			en: {
				common: {
					acceptAll: 'Default Accept All',
					rejectAll: 'Default Reject All',
					customize: 'Default Customize',
					save: 'Default Save',
				},
				cookieBanner: {
					title: 'Default Title',
					description: 'Default Description',
				},
				consentManagerDialog: {
					title: 'Default Dialog',
				},
				consentTypes: {
					necessary: {
						title: 'Necessary',
						description: 'These cookies are required',
					},
				},
			},
			de: {
				common: {
					acceptAll: 'German Accept All',
					rejectAll: 'German Reject All',
					customize: 'German Customize',
					save: 'German Save',
				},
				cookieBanner: {
					title: 'German Title',
					description: 'German Description',
				},
				consentManagerDialog: {
					title: 'German Dialog',
				},
				consentTypes: {
					necessary: {
						title: 'Notwendig',
						description: 'Diese Cookies sind erforderlich',
					},
				},
			},
		},
		defaultLanguage: 'en',
	};

	it('should merge configs with custom taking priority', () => {
		const customConfig: Partial<TranslationConfig> = {
			translations: {
				en: {
					cookieBanner: {
						title: 'Custom Title',
					},
				},
			},
			defaultLanguage: 'de',
		};

		const result = mergeTranslationConfigs(defaultConfig, customConfig);
		const enTranslations = result.translations.en;
		const deTranslations = result.translations.de;

		expect(result.defaultLanguage).toBe('de');
		expect(enTranslations?.cookieBanner?.title).toBe('Custom Title');
		expect(enTranslations?.cookieBanner?.description).toBe(
			'Default Description'
		);
		expect(deTranslations).toEqual(defaultConfig.translations.de);
	});

	it('should handle undefined custom config', () => {
		const result = mergeTranslationConfigs(defaultConfig);
		expect(result).toEqual(defaultConfig);
	});
});

describe('detectBrowserLanguage', () => {
	const mockNavigator = {
		language: 'en-US',
	};

	beforeEach(() => {
		vi.stubGlobal('window', { navigator: mockNavigator });
	});

	it('should return default language when auto-switch is disabled', () => {
		const result = detectBrowserLanguage({ en: {}, de: {} }, 'de', true);
		expect(result).toBe('de');
	});

	it('should return en when no default language is provided and auto-switch is disabled', () => {
		const result = detectBrowserLanguage({ en: {}, de: {} }, undefined, true);
		expect(result).toBe('en');
	});

	it('should detect browser language when available', () => {
		mockNavigator.language = 'de-DE';
		const result = detectBrowserLanguage({ en: {}, de: {} }, 'en', false);
		expect(result).toBe('de');
	});

	it('should fall back to default language when browser language not available', () => {
		mockNavigator.language = 'fr-FR';
		const result = detectBrowserLanguage({ en: {}, de: {} }, 'en', false);
		expect(result).toBe('en');
	});
});

describe('prepareTranslationConfig', () => {
	const defaultConfig: TranslationConfig = {
		translations: {
			en: {
				cookieBanner: {
					title: 'Default Title',
				},
			},
			de: {
				cookieBanner: {
					title: 'German Title',
				},
			},
		},
		defaultLanguage: 'en',
	};

	it('should prepare config with detected language', () => {
		vi.stubGlobal('window', { navigator: { language: 'de-DE' } });

		const result = prepareTranslationConfig(defaultConfig);
		expect(result.defaultLanguage).toBe('de');
	});

	it('should respect custom config settings', () => {
		const customConfig: Partial<TranslationConfig> = {
			translations: {
				en: {
					cookieBanner: {
						title: 'Custom Title',
					},
				},
			},
			defaultLanguage: 'en',
			disableAutoLanguageSwitch: true,
		};

		const result = prepareTranslationConfig(defaultConfig, customConfig);
		expect(result.defaultLanguage).toBe('en');
		expect(result.translations.en?.cookieBanner?.title).toBe('Custom Title');
	});
});
