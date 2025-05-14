export type AllConsentNames =
	| 'experience'
	| 'functionality'
	| 'marketing'
	| 'measurement'
	| 'necessary';

export interface CommonTranslations {
	acceptAll: string;
	rejectAll: string;
	customize: string;
	save: string;
}

export interface CookieBannerTranslations {
	title: string;
	description: string;
}

export interface ConsentManagerDialogTranslations {
	title: string;
	description: string;
}

export interface ConsentTypeTranslations {
	title: string;
	description: string;
}

/**
 * Maps consent type names to their respective translations.
 * Uses the name property from ConsentType to ensure type safety.
 */
export type ConsentTypesTranslations = {
	[key in AllConsentNames]: ConsentTypeTranslations;
};

// Complete translations interface (used for English/default language)
export interface CompleteTranslations {
	common: CommonTranslations;
	cookieBanner: CookieBannerTranslations;
	consentManagerDialog: ConsentManagerDialogTranslations;
	consentTypes: ConsentTypesTranslations;
}

// Partial translations interface (used for other languages)
export interface Translations {
	common: Partial<CommonTranslations>;
	cookieBanner: Partial<CookieBannerTranslations>;
	consentManagerDialog: Partial<ConsentManagerDialogTranslations>;
	consentTypes: Partial<ConsentTypesTranslations>;
}

export interface TranslationConfig {
	translations: Record<string, Partial<Translations>>;
	defaultLanguage?: string;
	disableAutoLanguageSwitch?: boolean;
}
