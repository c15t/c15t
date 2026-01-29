import {
	baseTranslations,
	type CompleteTranslations,
	deepMergeTranslations,
	selectLanguage,
	type Translations,
} from '@c15t/translations';

type SupportedBaseLanguage = keyof typeof baseTranslations;

function isSupportedBaseLanguage(lang: string): lang is SupportedBaseLanguage {
	return lang in baseTranslations;
}

/**
 * Gets the translations data for a given language, merging custom translations if provided.
 *
 * @param acceptLanguage - The `Accept-Language` header from the request.
 * @param customTranslations - An object containing custom translations to merge with the base translations.
 * @returns An object containing the final translations and the determined language.
 */
export function getTranslationsData(
	acceptLanguage: string | null,
	customTranslations?: Record<string, Partial<Translations>>
) {
	const supportedDefaultLanguages = Object.keys(baseTranslations);
	const supportedCustomLanguages = Object.keys(customTranslations || {});

	const supportedLanguages = [
		...supportedDefaultLanguages,
		...supportedCustomLanguages,
	];

	const preferredLanguage = selectLanguage(supportedLanguages, {
		header: acceptLanguage,
		fallback: 'en',
	});

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

/**
 * Gets the translations for a given language from options.
 *
 * @param acceptLanguage - The `Accept-Language` header from the request.
 * @param options - The C15T options containing custom translations.
 * @returns An object containing the final translations and the determined language.
 */
export async function getTranslations(
	acceptLanguage: string,
	options: {
		advanced?: { customTranslations?: Record<string, Partial<Translations>> };
	}
) {
	return getTranslationsData(
		acceptLanguage,
		options.advanced?.customTranslations
	);
}
