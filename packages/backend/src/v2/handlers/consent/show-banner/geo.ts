import {
	type JurisdictionCode,
	JurisdictionMessages,
} from '~/v2/contracts/shared/jurisdiction.schema';

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

	// Default to no jurisdiction, but show banner
	let showConsentBanner = true;
	let jurisdictionCode: JurisdictionCode = 'NONE';

	// Check country code against jurisdiction sets
	if (countryCode) {
		// Normalize country code to uppercase for case-insensitive comparison
		const normalizedCountryCode = countryCode.toUpperCase();

		// Default to false as we don't know if it fits any jurisdiction yet
		showConsentBanner = false;

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
			if (sets.some((set) => set.has(normalizedCountryCode))) {
				jurisdictionCode = code;
				showConsentBanner = true;
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
