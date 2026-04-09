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
	close: string;
}

export interface LegalLinksTranslations {
	privacyPolicy: string;
	cookiePolicy: string;
	termsOfService: string;
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

export interface FrameTranslations {
	/**
	 * You can use the {category} placeholder to dynamically insert the consent category name.
	 */
	title: string;
	/**
	 * You can use the {category} placeholder to dynamically insert the consent category name.
	 */
	actionButton: string;
	/**
	 * Message shown when the frame category is blocked by active policy scope.
	 */
	policyBlocked: string;
}

export interface IABBannerTranslations {
	title: string;
	/**
	 * Use {partnerCount} placeholder to insert the partner count.
	 */
	description: string;
	/**
	 * Use {count} placeholder to insert the partner count.
	 */
	partnersLink: string;
	/**
	 * Use {count} placeholder to insert the remaining purposes count.
	 */
	andMore: string;
	legitimateInterestNotice: string;
	/** Consent scope for service-specific setups */
	scopeServiceSpecific: string;
	/** Consent scope for group or network setups */
	scopeGroup: string;
}

export interface IABPreferenceCenterTranslations {
	title: string;
	description: string;
	tabs: {
		purposes: string;
		vendors: string;
	};
	purposeItem: {
		/**
		 * Use {count} placeholder for partner count.
		 */
		partners: string;
		/**
		 * Use {count} placeholder for vendor count.
		 */
		vendorsUseLegitimateInterest: string;
		examples: string;
		partnersUsingPurpose: string;
		withYourPermission: string;
		/** Standard terminology for legitimate interest */
		legitimateInterest: string;
		/** Button text for objecting to LI processing */
		objectButton: string;
		/** Text shown when user has objected to LI */
		objected: string;
		/** Explanation about right to object to LI */
		rightToObject: string;
	};
	specialPurposes: {
		title: string;
		tooltip: string;
	};
	vendorList: {
		search: string;
		/**
		 * Use {filtered} and {total} placeholders.
		 */
		showingCount: string;
		iabVendorsHeading: string;
		iabVendorsNotice: string;
		customVendorsHeading: string;
		customVendorsNotice: string;
		purposes: string;
		specialPurposes: string;
		specialFeatures: string;
		features: string;
		dataCategories: string;
		usesCookies: string;
		nonCookieAccess: string;
		/**
		 * Use {days} placeholder for max age in days.
		 */
		maxAge: string;
		/**
		 * Use {days} placeholder for retention in days.
		 */
		retention: string;
		legitimateInterest: string;
		privacyPolicy: string;
		storageDisclosure: string;
		requiredNotice: string;
	};
	footer: {
		consentStorage: string;
	};
}

export interface IABCommonTranslations {
	acceptAll: string;
	rejectAll: string;
	customize: string;
	saveSettings: string;
	loading: string;
	showingSelectedVendor: string;
	clearSelection: string;
	customPartner: string;
}

export interface IABTranslations {
	banner: IABBannerTranslations;
	preferenceCenter: IABPreferenceCenterTranslations;
	common: IABCommonTranslations;
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
	frame: FrameTranslations;
	legalLinks: LegalLinksTranslations;
	iab: IABTranslations;
}

// Partial translations interface (used for other languages)
export interface Translations {
	common: Partial<CommonTranslations>;
	cookieBanner: Partial<CookieBannerTranslations>;
	consentManagerDialog: Partial<ConsentManagerDialogTranslations>;
	consentTypes: {
		[key in AllConsentNames]?: Partial<ConsentTypeTranslations>;
	};
	frame?: Partial<FrameTranslations>;
	legalLinks?: Partial<LegalLinksTranslations>;
	iab?: DeepPartial<IABTranslations>;
}

// Helper type for deep partial
type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface TranslationConfig {
	translations: Record<string, Partial<Translations>>;
	defaultLanguage?: string;
	disableAutoLanguageSwitch?: boolean;
}

/**
 * Preferred i18n configuration shape for c15t v2.
 *
 * @remarks
 * This maps to the legacy {@link TranslationConfig} as follows:
 * - `messages` -> `translations`
 * - `locale` -> `defaultLanguage`
 * - `detectBrowserLanguage` -> inverse of `disableAutoLanguageSwitch`
 *
 * Edge cases:
 * - If `messages` is empty, English defaults are still injected by merge helpers.
 * - If `locale` is undefined, language resolution falls back to browser detection,
 *   then to `'en'`.
 * - If `detectBrowserLanguage` is undefined, browser detection remains enabled.
 *
 * @example
 * ```ts
 * const i18n = {
 *   locale: 'en',
 *   detectBrowserLanguage: false,
 *   messages: {
 *     en: { common: { acceptAll: 'Accept all' } },
 *     de: { common: { acceptAll: 'Alle akzeptieren' } },
 *   },
 * };
 * ```
 *
 * @see {@link TranslationConfig}
 * @see {@link Translations}
 */
export interface I18nConfig {
	/**
	 * Translation message map keyed by language code (`en`, `de`, `fr`, ...).
	 */
	messages: Record<string, Partial<Translations>>;
	/**
	 * Preferred language code used as the initial fallback locale.
	 */
	locale?: string;
	/**
	 * Whether to auto-detect from browser language settings.
	 *
	 * @remarks
	 * This is the inverse of legacy `disableAutoLanguageSwitch`.
	 */
	detectBrowserLanguage?: boolean;
}

/**
 * Input shape accepted by translation helpers in both legacy and v2 formats.
 *
 * @remarks
 * This interface accepts:
 * - legacy `TranslationConfig` fields (`translations`, `defaultLanguage`,
 *   `disableAutoLanguageSwitch`)
 * - v2 `i18n` fields (`messages`, `locale`, `detectBrowserLanguage`)
 *
 * Prefer supplying `i18n` for new code and keep legacy fields only for
 * compatibility during migration.
 *
 * @example
 * ```ts
 * const legacyInput = {
 *   translations: { en: { common: { acceptAll: 'Accept all' } } },
 *   defaultLanguage: 'en',
 * };
 *
 * const v2Input = {
 *   i18n: {
 *     locale: 'de',
 *     messages: { de: { common: { acceptAll: 'Alle akzeptieren' } } },
 *   },
 * };
 * ```
 *
 * @see {@link TranslationConfig}
 * @see {@link I18nConfig}
 */
export interface TranslationInputConfig extends Partial<TranslationConfig> {
	i18n?: Partial<I18nConfig>;
}
