import type { ContractsOutputs } from '@c15t/backend';
import { baseTranslations } from '@c15t/translations';

export type SupportedLanguage = keyof typeof baseTranslations;
type JurisdictionCode =
	ContractsOutputs['showConsentBanner']['jurisdiction']['code'];

export const JurisdictionMessages: Record<JurisdictionCode, string> = {
	GDPR: 'GDPR or equivalent regulations require a cookie banner.',
	CH: 'Switzerland requires similar data protection measures.',
	BR: "Brazil's LGPD requires consent for cookies.",
	PIPEDA: 'PIPEDA requires consent for data collection.',
	AU: "Australia's Privacy Act mandates transparency about data collection.",
	APPI: "Japan's APPI requires consent for data collection.",
	PIPA: "South Korea's PIPA requires consent for data collection.",
	NONE: 'No specific requirements',
} as const;

/**
 * Extracts the preferred language from Accept-Language header
 * Falls back to 'en' if no supported language is found
 */
function getPreferredLanguage(acceptLanguage: string | null): string {
	if (!acceptLanguage) {
		return 'en';
	}

	// Get the primary language code
	const primaryLang = acceptLanguage
		.split(',')[0]
		?.split(';')[0]
		?.split('-')[0]
		?.toLowerCase();

	// Check if it's a supported language
	if (primaryLang && primaryLang in baseTranslations) {
		return primaryLang as SupportedLanguage;
	}

	return 'en';
}

/**
 * Handler for the show consent banner endpoint
 * Determines if a user should see a consent banner based on their location
 */
export const showBanner = (headers: Record<string, string>) => {
	// Add this conversion to ensure headers are always string or null
	const normalizeHeader = (
		value: string | string[] | null | undefined
	): string | null => {
		if (!value) {
			return null;
		}

		return Array.isArray(value) ? (value[0] ?? null) : value;
	};

	const countryCode =
		normalizeHeader(headers['cf-ipcountry']) ??
		normalizeHeader(headers['x-vercel-ip-country']) ??
		normalizeHeader(headers['x-amz-cf-ipcountry']) ??
		normalizeHeader(headers['x-country-code']);

	const regionCode =
		normalizeHeader(headers['x-vercel-ip-country-region']) ??
		normalizeHeader(headers['x-region-code']);

	// Get preferred language from Accept-Language header
	const acceptLanguage = normalizeHeader(headers['accept-language']);
	const preferredLanguage = getPreferredLanguage(acceptLanguage);

	// Determine jurisdiction based on country
	const { showConsentBanner, jurisdictionCode, message } =
		checkJurisdiction(countryCode);

	// Return properly structured response with translations
	return {
		showConsentBanner,
		jurisdiction: {
			code: jurisdictionCode,
			message,
		},
		location: { countryCode, regionCode },
		translations: {
			translations: baseTranslations[preferredLanguage as SupportedLanguage],
			language: preferredLanguage,
		},
	};
};

/**
 * Determines if a consent banner should be shown based on country code
 * and returns appropriate jurisdiction information
 */
export function checkJurisdiction(countryCode: string | null) {
	// Country code sets for different jurisdictions
	const jurisdictions = {
		EU: new Set([
			'AT',
			'BE',
			'BG',
			'HR',
			'CY',
			'CZ',
			'DK',
			'EE',
			'FI',
			'FR',
			'DE',
			'GR',
			'HU',
			'IE',
			'IT',
			'LV',
			'LT',
			'LU',
			'MT',
			'NL',
			'PL',
			'PT',
			'RO',
			'SK',
			'SI',
			'ES',
			'SE',
		]),
		EEA: new Set(['IS', 'NO', 'LI']),
		UK: new Set(['GB']),
		CH: new Set(['CH']),
		BR: new Set(['BR']),
		CA: new Set(['CA']),
		AU: new Set(['AU']),
		JP: new Set(['JP']),
		KR: new Set(['KR']),
	};

	// Default to no jurisdiction
	const showConsentBanner = true;
	let jurisdictionCode: JurisdictionCode = 'NONE';

	// Check country code against jurisdiction sets
	if (countryCode) {
		// Map jurisdiction sets to their respective codes
		const jurisdictionMap = [
			{
				sets: [jurisdictions.EU, jurisdictions.EEA, jurisdictions.UK],
				code: 'GDPR',
			},
			{ sets: [jurisdictions.CH], code: 'CH' },
			{ sets: [jurisdictions.BR], code: 'BR' },
			{ sets: [jurisdictions.CA], code: 'PIPEDA' },
			{ sets: [jurisdictions.AU], code: 'AU' },
			{ sets: [jurisdictions.JP], code: 'APPI' },
			{ sets: [jurisdictions.KR], code: 'PIPA' },
		] as const;

		// Find matching jurisdiction
		for (const { sets, code } of jurisdictionMap) {
			if (sets.some((set) => set.has(countryCode))) {
				jurisdictionCode = code;
				break;
			}
		}
	}

	// Get corresponding message from shared schema
	const message = JurisdictionMessages[jurisdictionCode];

	return {
		showConsentBanner,
		jurisdictionCode,
		message,
	};
}
