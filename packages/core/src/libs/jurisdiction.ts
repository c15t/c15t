import type { JurisdictionCode } from '@c15t/schema/types';

/**
 * Determines the jurisdiction code based on the provided country code.
 *
 * @remarks
 * This mirrors the backend jurisdiction logic and returns only the
 * jurisdiction code. Banner visibility is derived elsewhere using
 * `jurisdiction !== 'NONE'`.
 */
export function checkJurisdiction(
	countryCode: string | null
): JurisdictionCode {
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
	let jurisdictionCode: JurisdictionCode = 'NONE';

	// Check country code against jurisdiction sets
	if (countryCode) {
		// Normalize country code to uppercase for case-insensitive comparison
		const normalizedCountryCode = countryCode.toUpperCase();

		// Map jurisdiction sets to their respective codes
		const jurisdictionMap: Array<{
			sets: Set<string>[];
			code: JurisdictionCode;
		}> = [
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
		];

		// Find matching jurisdiction
		for (const { sets, code } of jurisdictionMap) {
			if (sets.some((set) => set.has(normalizedCountryCode))) {
				jurisdictionCode = code;
				break;
			}
		}
	}

	return jurisdictionCode;
}
