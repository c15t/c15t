import { defaultTranslationConfig } from 'c15t';
import { useTranslations } from '~/hooks/use-translations';

/**
 * IAB translations interface.
 * This matches the structure in @c15t/translations but is defined locally
 * to avoid cross-package type dependencies.
 */
interface IABTranslations {
	banner: {
		title: string;
		description: string;
		partnersLink: string;
		andMore: string;
		legitimateInterestNotice: string;
	};
	common: {
		acceptAll: string;
		rejectAll: string;
		customize: string;
		saveSettings: string;
		loading: string;
		showingSelectedVendor: string;
		clearSelection: string;
		customPartner: string;
	};
	preferenceCenter: {
		title: string;
		description: string;
		tabs: {
			purposes: string;
			vendors: string;
		};
		purposeItem: {
			partners: string;
			vendorsUseLegitimateInterest: string;
			examples: string;
			partnersUsingPurpose: string;
			withYourPermission: string;
			legitimateInterest: string;
			objectButton: string;
			objected: string;
			rightToObject: string;
		};
		specialPurposes: {
			title: string;
			tooltip: string;
		};
		vendorList: {
			search: string;
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
			maxAge: string;
			legitimateInterest: string;
			privacyPolicy: string;
			storageDisclosure: string;
			requiredNotice: string;
		};
		footer: {
			consentStorage: string;
		};
	};
}

// Get the default IAB translations from the translations package
// This is the single source of truth - no duplicated default strings
// biome-ignore lint/style/noNonNullAssertion: enTranslations is guaranteed to exist in defaultTranslationConfig
const DEFAULT_IAB_TRANSLATIONS = defaultTranslationConfig.translations.en!
	.iab as IABTranslations;

/**
 * Deep merge helper for IAB translations
 */
function deepMerge<T extends Record<string, unknown>>(
	defaults: T,
	overrides?: Partial<T>
): T {
	if (!overrides) {
		return defaults;
	}

	const result = { ...defaults };

	for (const key of Object.keys(defaults) as (keyof T)[]) {
		const defaultValue = defaults[key];
		const overrideValue = overrides[key];

		if (
			overrideValue !== undefined &&
			typeof defaultValue === 'object' &&
			defaultValue !== null &&
			typeof overrideValue === 'object' &&
			overrideValue !== null &&
			!Array.isArray(defaultValue)
		) {
			result[key] = deepMerge(
				defaultValue as Record<string, unknown>,
				overrideValue as Record<string, unknown>
			) as T[keyof T];
		} else if (overrideValue !== undefined) {
			result[key] = overrideValue as T[keyof T];
		}
	}

	return result;
}

/**
 * Hook to get IAB translations with fallback to defaults from the translations package.
 *
 * This hook safely accesses IAB-specific translations and falls back to the
 * built-in English translations if the user hasn't provided custom translations.
 *
 * @returns Complete IAB translations object
 */
export function useIABTranslations(): IABTranslations {
	const translations = useTranslations();

	if (!translations.iab) {
		return DEFAULT_IAB_TRANSLATIONS;
	}

	// Deep merge user translations with defaults
	return {
		banner: deepMerge(
			DEFAULT_IAB_TRANSLATIONS.banner,
			translations.iab.banner as Partial<IABTranslations['banner']>
		),
		common: deepMerge(
			DEFAULT_IAB_TRANSLATIONS.common,
			translations.iab.common as Partial<IABTranslations['common']>
		),
		preferenceCenter: deepMerge(
			DEFAULT_IAB_TRANSLATIONS.preferenceCenter,
			translations.iab.preferenceCenter as Partial<
				IABTranslations['preferenceCenter']
			>
		),
	};
}
