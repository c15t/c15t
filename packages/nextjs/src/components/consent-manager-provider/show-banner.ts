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

const JURISDICTION_MAPPINGS = new Map<string, JurisdictionCode>([
	// GDPR countries (EU + EEA + UK)
	...[
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
		'IS',
		'NO',
		'LI',
		'GB',
	].map((country): [string, JurisdictionCode] => [country, 'GDPR']),
	// Other jurisdictions
	['CH', 'CH'],
	['BR', 'BR'],
	['CA', 'PIPEDA'],
	['AU', 'AU'],
	['JP', 'APPI'],
	['KR', 'PIPA'],
] as [string, JurisdictionCode][]);

const COUNTRY_HEADERS = [
	'cf-ipcountry',
	'x-vercel-ip-country',
	'x-amz-cf-ipcountry',
	'x-country-code',
] as const;

const REGION_HEADERS = ['x-vercel-ip-country-region', 'x-region-code'] as const;

function extractCountryCode(headers: Record<string, string>): string | null {
	for (const headerName of COUNTRY_HEADERS) {
		const value = headers[headerName];
		if (value) {
			return value.toUpperCase(); // Normalize to uppercase for consistent lookup
		}
	}
	return null;
}

function extractRegionCode(headers: Record<string, string>): string | null {
	for (const headerName of REGION_HEADERS) {
		const value = headers[headerName];
		if (value) {
			return value;
		}
	}
	return null;
}

function getPreferredLanguage(
	acceptLanguage: string | null
): SupportedLanguage {
	if (!acceptLanguage) {
		return 'en';
	}

	const primaryLang = acceptLanguage
		.split(',')[0]
		?.split(';')[0]
		?.split('-')[0]
		?.toLowerCase();

	if (primaryLang && primaryLang in baseTranslations) {
		return primaryLang as SupportedLanguage;
	}

	return 'en';
}

export function checkJurisdiction(countryCode: string | null) {
	// Early return for no country code (e.g. localhost)
	if (!countryCode) {
		return {
			showConsentBanner: true,
			jurisdictionCode: 'NONE' as JurisdictionCode,
			message: JurisdictionMessages.NONE,
		};
	}

	const normalizedCountryCode = countryCode.toUpperCase();
	const jurisdictionCode = JURISDICTION_MAPPINGS.get(normalizedCountryCode);

	if (jurisdictionCode) {
		return {
			showConsentBanner: true,
			jurisdictionCode,
			message: JurisdictionMessages[jurisdictionCode],
		};
	}

	// Country not in any jurisdiction - don't show banner
	return {
		showConsentBanner: false,
		jurisdictionCode: 'NONE' as JurisdictionCode,
		message: JurisdictionMessages.NONE,
	};
}

export const showBanner = (
	headers: Record<string, string>
): ContractsOutputs['consent']['showBanner'] => {
	const countryCode = extractCountryCode(headers);
	const regionCode = extractRegionCode(headers);

	const acceptLanguage = headers['accept-language'] || null;
	const preferredLanguage = getPreferredLanguage(acceptLanguage);

	const { showConsentBanner, jurisdictionCode, message } =
		checkJurisdiction(countryCode);

	return {
		showConsentBanner,
		jurisdiction: {
			code: jurisdictionCode,
			message,
		},
		location: {
			countryCode,
			regionCode,
		},
		translations: {
			translations: baseTranslations[preferredLanguage],
			language: preferredLanguage,
		},
	};
};
