import { translations as enTranslations } from './translations/en';
import type { TranslationConfig, Translations } from './types';

type TranslationSection =
	| 'common'
	| 'cookieBanner'
	| 'consentManagerDialog'
	| 'consentTypes'
	| 'frame'
	| 'legalLinks';

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
		'frame',
		'legalLinks',
	];

	return sections.reduce((result, section) => {
		const baseSection = base[section];
		const overrideSection = override[section];

		// Only include section if it exists in base or override
		if (baseSection || overrideSection) {
			result[section] = {
				...(baseSection || {}),
				...(overrideSection || {}),
			};
		}
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
	const translations: Record<string, Partial<Translations>> = {
		en: JSON.parse(JSON.stringify(enTranslations)),
	};

	const allTranslationSets = [
		defaultConfig.translations,
		customConfig?.translations,
	];

	for (const translationSet of allTranslationSets) {
		if (!translationSet) {
			continue;
		}

		for (const [lang, trans] of Object.entries(translationSet)) {
			if (!trans) {
				continue;
			}
			const base = translations[lang] || translations.en;
			translations[lang] = deepMergeTranslations(
				base as Translations,
				trans as Partial<Translations>
			);
		}
	}

	return {
		...defaultConfig,
		...customConfig,
		translations: translations as Record<string, Translations>,
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
