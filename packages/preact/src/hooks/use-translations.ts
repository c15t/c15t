'use client';

import type { Translations } from 'c15t';
import { defaultTranslationConfig } from 'c15t';
import { useMemo } from 'preact/hooks';
import { useConsentManager } from './use-consent-manager';

/**
 * Hook for accessing translations in the current language.
 *
 * @public
 */
export function useTranslations(): Translations {
	const { translationConfig } = useConsentManager();

	return useMemo(() => {
		const { translations = {}, defaultLanguage = 'en' } = translationConfig;

		const selectedTranslations = translations[defaultLanguage];
		if (isTranslations(selectedTranslations)) {
			return selectedTranslations;
		}

		const englishTranslations = translations.en;
		if (isTranslations(englishTranslations)) {
			return englishTranslations;
		}

		return defaultTranslationConfig.translations.en as Translations;
	}, [translationConfig]);
}

// Type guard to check if a value is a valid Translations object
function isTranslations(value: unknown): value is Translations {
	if (!value || typeof value !== 'object') return false;

	const obj = value as Record<string, unknown>;
	return (
		'cookieBanner' in obj &&
		'consentManagerDialog' in obj &&
		'consentTypes' in obj &&
		'common' in obj
	);
}
