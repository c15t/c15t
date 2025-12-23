import type { JurisdictionCode } from '~/contracts/init';

/**
 * Determines the applicable jurisdiction based on country and region codes.
 *
 * @remarks
 * - EU/EEA/UK map to GDPR-style regimes.
 * - Specific countries map to their local laws (CH, BR, CA, AU, JP, KR).
 * - CCPA is applied for certain US regions (e.g. California).
 */
export function checkJurisdiction(
	countryCode: string | null,
	regionCode?: string | null
): JurisdictionCode {
	// Country/region sets for different jurisdictions
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
		US_CCPA_REGIONS: new Set([
			// California (CCPA/CPRA)
			'CA',
		]),
	};

	// Default to no jurisdiction
	let jurisdiction: JurisdictionCode = 'NONE';

	// Check country/region codes against jurisdiction sets
	if (countryCode) {
		// Normalize for case-insensitive comparison
		const normalizedCountryCode = countryCode.toUpperCase();
		const normalizedRegionCode =
			regionCode && typeof regionCode === 'string'
				? regionCode.toUpperCase()
				: null;

		// CCPA-style rules: currently applied for certain US regions only
		if (
			normalizedCountryCode === 'US' &&
			normalizedRegionCode &&
			jurisdictions.US_CCPA_REGIONS.has(normalizedRegionCode)
		) {
			return 'CCPA';
		}

		const jurisdictionMap = [
			{
				sets: [jurisdictions.UK],
				code: 'UK_GDPR' as const,
			},
			{
				sets: [jurisdictions.EU, jurisdictions.EEA],
				code: 'GDPR' as const,
			},
			{ sets: [jurisdictions.CH], code: 'CH' as const },
			{ sets: [jurisdictions.BR], code: 'BR' as const },
			{ sets: [jurisdictions.CA], code: 'PIPEDA' as const },
			{ sets: [jurisdictions.AU], code: 'AU' as const },
			{ sets: [jurisdictions.JP], code: 'APPI' as const },
			{ sets: [jurisdictions.KR], code: 'PIPA' as const },
		];

		// Find matching jurisdiction
		for (const { sets, code } of jurisdictionMap) {
			if (sets.some((set) => set.has(normalizedCountryCode))) {
				jurisdiction = code;
				break;
			}
		}
	}

	return jurisdiction;
}
