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
}

// ─────────────────────────────────────────────────────────────────────────────
// IAB TCF 2.3 Translations
// ─────────────────────────────────────────────────────────────────────────────

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
		dataCategories: string;
		usesCookies: string;
		nonCookieAccess: string;
		/**
		 * Use {days} placeholder for max age in days.
		 */
		maxAge: string;
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
