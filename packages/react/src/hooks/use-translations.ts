'use client';

import type { Translations } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { useMemo } from 'react';
import { useConsentManager } from './use-consent-manager';
/**
 * Hook for accessing translations in the current language.
 *
 * @remarks
 * This hook provides access to the translations for the currently selected language.
 * It automatically handles language selection based on the translation configuration.
 * Falls back to English if the selected language is not available.
 *
 * @returns The translations for the current language
 *
 * @example
 * ```tsx
 * function CookieBanner() {
 *   const translations = useTranslations();
 *
 *   return (
 *     <div>
 *       <h2>{translations.cookieBanner.title}</h2>
 *       <p>{translations.cookieBanner.description}</p>
 *     </div>
 *   );
 * }
 * ```
 *
 * @public
 */
export function useTranslations(): Translations {
	const { translationConfig } = useConsentManager();

	return useMemo(() => {
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
		// We know this is a valid Translations object
		return defaultTranslationConfig.translations.en as Translations;
	}, [translationConfig]);
}

// Type guard to check if a value is a valid Translations object
function isTranslations(value: unknown): value is Translations {
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
