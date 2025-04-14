'use client';
import type { TranslationConfig, Translations } from 'c15t';

type TranslationSection =
  | 'cookieBanner'
  | 'consentManagerDialog'
  | 'consentManagerWidget'
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
    'consentManagerWidget',
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
        const baseTranslations = mergedTranslations.en;
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

  // Normalize language codes to lowercase for consistent comparison
  const availableLanguages = Object.keys(translations).map((lang) =>
    lang.toLowerCase()
  );

  const browserLanguages =
    typeof window !== 'undefined'
      ? navigator?.languages || [navigator?.language || 'en']
      : ['en'];

  for (const lang of browserLanguages) {
    // Try exact match first (e.g., 'en-US' if available)
    const normalizedLang = lang.toLowerCase();

    if (availableLanguages.includes(normalizedLang)) {
      return normalizedLang;
    }

    // Try primary language match (e.g., 'en' from 'en-US')
    const primaryLang = normalizedLang.split('-')[0];

    if (primaryLang && availableLanguages.includes(primaryLang)) {
      return primaryLang;
    }
  }

  return 'en';
}
