import type { TranslationConfig, Translations } from 'c15t';

/**
 * Resolves translations based on the provided configuration and default language.
 */
export function resolveTranslations(
	translationConfig: Partial<TranslationConfig>,
	defaultTranslationConfig: TranslationConfig
): Translations {
	const { translations = {}, defaultLanguage = 'en' } = translationConfig;

	// Return translations for the default language, falling back to English if needed
	const selectedTranslations = translations[defaultLanguage];
	if (isTranslations(selectedTranslations)) {
		return selectedTranslations;
	}

	const englishTranslations = translations.en;
	if (isTranslations(englishTranslations)) {
		return englishTranslations;
	}

	// Fallback to core default English translations
	return defaultTranslationConfig.translations.en as Translations;
}

/**
 * Type guard to check if a value is a valid Translations object.
 */
export function isTranslations(value: unknown): value is Translations {
	if (!value || typeof value !== 'object') {
		return false;
	}

	const obj = value as Record<string, unknown>;
	const hasRequiredKeys =
		'cookieBanner' in obj &&
		'consentManagerDialog' in obj &&
		'consentTypes' in obj &&
		'common' in obj;

	return hasRequiredKeys;
}
