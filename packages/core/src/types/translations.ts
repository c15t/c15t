import type { ConsentType } from './gdpr';

export interface CookieBannerTranslations {
	title: string;
	description: string;
	acceptAll: string;
	rejectAll: string;
	customize: string;
}

export interface ConsentManagerDialogTranslations {
	title: string;
	description: string;
	save: string;
	acceptAll: string;
	rejectAll: string;
	close: string;
}

export interface ConsentTypeTranslations {
	title: string;
	description: string;
}

export interface ConsentManagerWidgetTranslations {
	title: string;
	description: string;
	save: string;
	acceptAll: string;
	rejectAll: string;
}

/**
 * Maps consent type names to their respective translations.
 * Uses the name property from ConsentType to ensure type safety.
 */
export type ConsentTypesTranslations = {
	[key in ConsentType['name']]: ConsentTypeTranslations;
};

// Complete translations interface (used for English/default language)
export interface CompleteTranslations {
	cookieBanner: CookieBannerTranslations;
	consentManagerDialog: ConsentManagerDialogTranslations;
	consentManagerWidget: ConsentManagerWidgetTranslations;
	consentTypes: ConsentTypesTranslations;
}

// Partial translations interface (used for other languages)
export interface Translations {
	cookieBanner: Partial<CookieBannerTranslations>;
	consentManagerDialog: Partial<ConsentManagerDialogTranslations>;
	consentManagerWidget: Partial<ConsentManagerWidgetTranslations>;
	consentTypes: Partial<ConsentTypesTranslations>;
}
export interface TranslationConfig {
	translations: Record<string, Partial<Translations>>;
	defaultLanguage?: string;
	disableAutoLanguageSwitch?: boolean;
}
