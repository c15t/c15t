import type { TranslationConfig, Translations } from '@c15t/translations';

type TranslationSection =
	| 'common'
	| 'cookieBanner'
	| 'consentManagerDialog'
	| 'consentTypes';

/**
 * Deep merges translation objects
 */
export function deepMergeTranslations(
	base: Translations,
	override: Partial<Translations>
): Translations {
	const sections: TranslationSection[] = [
		'cookieBanner',
		'consentManagerDialog',
		'common',
		'consentTypes',
	];

	return sections.reduce((result, section) => {
		result[section] = {
			...base[section],
			...(override[section] || {}),
		};
		return result;
	}, {} as Translations);
}

/**
 * Merges custom translations with defaults
 */
export function mergeTranslationConfigs(
	defaultConfig: TranslationConfig,
	customConfig?: Partial<TranslationConfig>
): TranslationConfig {
	const mergedTranslations = { ...defaultConfig.translations };

	if (customConfig?.translations) {
		// Merge English translations first
		if (customConfig.translations.en) {
			mergedTranslations.en = deepMergeTranslations(
				defaultConfig.translations.en as Translations,
				customConfig.translations.en as Partial<Translations>
			);
		}

		// Merge other languages
		for (const [lang, translations] of Object.entries(
			customConfig.translations
		)) {
			if (lang !== 'en' && translations) {
				// Use existing translations for this language as base if they exist,
				// otherwise fall back to English
				const baseTranslations =
					defaultConfig.translations[lang] || mergedTranslations.en;
				mergedTranslations[lang] = deepMergeTranslations(
					baseTranslations as Translations,
					translations as Partial<Translations>
				);
			}
		}
	}
	return {
		...defaultConfig,
		...customConfig,
		translations: mergedTranslations as Record<string, Translations>,
	};
}

/**
 * Detects browser language and returns appropriate default language
 */
export function detectBrowserLanguage(
	translations: Record<string, unknown>,
	defaultLanguage: string | undefined,
	disableAutoSwitch = false
): string {
	if (disableAutoSwitch) {
		return defaultLanguage || 'en';
	}

	if (typeof window === 'undefined') {
		return defaultLanguage || 'en';
	}

	const browserLang = window.navigator.language?.split('-')[0] || '';
	return browserLang && browserLang in translations
		? browserLang
		: defaultLanguage || 'en';
}

/**
 * Prepares the translation configuration by merging defaults and detecting language
 */
export function prepareTranslationConfig(
	defaultConfig: TranslationConfig,
	customConfig?: Partial<TranslationConfig>
): TranslationConfig {
	const mergedConfig = mergeTranslationConfigs(defaultConfig, customConfig);
	const defaultLanguage = detectBrowserLanguage(
		mergedConfig.translations,
		mergedConfig.defaultLanguage,
		mergedConfig.disableAutoLanguageSwitch
	);
	return { ...mergedConfig, defaultLanguage };
}
