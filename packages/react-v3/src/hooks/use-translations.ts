'use client';

import { resolveTranslations } from '@c15t/ui/utils';
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
		return resolveTranslations(translationConfig, defaultTranslationConfig);
	}, [translationConfig]);
}
