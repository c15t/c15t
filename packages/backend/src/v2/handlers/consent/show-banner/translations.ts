import {
	type CompleteTranslations,
	type Translations,
	baseTranslations,
	deepMergeTranslations,
} from '@c15t/translations';

type SupportedBaseLanguage = keyof typeof baseTranslations;

function isSupportedBaseLanguage(lang: string): lang is SupportedBaseLanguage {
	return lang in baseTranslations;
}

/**
 * Extracts the preferred language from Accept-Language header
 * Falls back to 'en' if no supported language is found
 */
function getPreferredLanguage(
	acceptLanguage: string | null,
	supportedLanguages: string[]
): string {
	if (!acceptLanguage) {
		return 'en';
	}

	// Get the primary language code
	const primaryLang = acceptLanguage
		.split(',')[0]
		?.split(';')[0]
		?.split('-')[0]
		?.toLowerCase();

	// Check if it's a supported language
	if (primaryLang && supportedLanguages.includes(primaryLang)) {
		return primaryLang;
	}

	return 'en';
}

/**
 * Gets the translations for a given language, merging custom translations if provided.
 *
 * @param acceptLanguage - The `Accept-Language` header from the request.
 * @param customTranslations - An object containing custom translations to merge with the base translations.
 * @returns An object containing the final translations and the determined language.
 */
export function getTranslations(
	acceptLanguage: string | null,
	customTranslations?: Record<string, Partial<Translations>>
) {
	const supportedDefaultLanguages = Object.keys(baseTranslations);
	const supportedCustomLanguages = Object.keys(customTranslations || {});

	const supportedLanguages = [
		...supportedDefaultLanguages,
		...supportedCustomLanguages,
	];

	const preferredLanguage = getPreferredLanguage(
		acceptLanguage,
		supportedLanguages
	);

	const base = isSupportedBaseLanguage(preferredLanguage)
		? baseTranslations[preferredLanguage]
		: baseTranslations.en;

	const custom = supportedCustomLanguages.includes(preferredLanguage)
		? customTranslations?.[preferredLanguage]
		: {};

	const translations = custom ? deepMergeTranslations(base, custom) : base;

	return {
		translations: translations as CompleteTranslations,
		language: preferredLanguage,
	};
}
