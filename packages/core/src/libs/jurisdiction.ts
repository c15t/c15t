import type { JurisdictionCode } from '@c15t/schema/types';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

/**
 * Determines the jurisdiction code based on the provided country code.
 *
 * @remarks
 * This mirrors the backend jurisdiction logic and returns only the
 * jurisdiction code. Banner visibility is derived elsewhere using
 * `jurisdiction !== 'NONE'`.
 */
export const checkJurisdiction = function checkJurisdiction(
	countryCode: string | null,
	regionCode?: string | null
): JurisdictionCode {
	const jurisdictions = {
		AU: new Set(['AU']),
		BR: new Set(['BR']),
		CA: new Set(['CA']),
		CA_QC_REGIONS: new Set(['QC']),
		CH: new Set(['CH']),
		EEA: new Set(['IS', 'NO', 'LI']),
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
		JP: new Set(['JP']),
		KR: new Set(['KR']),
		UK: new Set(['GB']),
	};

	// Default to no jurisdiction
	let jurisdictionCode: JurisdictionCode = 'NONE';

	// Check country code against jurisdiction sets
	if (countryCode) {
		// Normalize country code to uppercase for case-insensitive comparison
		const normalizedCountryCode = countryCode.toUpperCase();
		// Normalize region code: handle dash-separated formats like "CA-QC" or "US-CA"
		// by extracting the last segment as the subdivision code
		const normalizedRegionCode =
			regionCode && typeof regionCode === 'string'
				? (regionCode.includes('-')
						? getDefined(regionCode.split('-').pop())
						: regionCode
					).toUpperCase()
				: null;

		// Quebec (Law 25): opt-in consent required
		if (
			normalizedCountryCode === 'CA' &&
			normalizedRegionCode &&
			jurisdictions.CA_QC_REGIONS.has(normalizedRegionCode)
		) {
			return 'QC_LAW25';
		}

		// Map jurisdiction sets to their respective codes
		const jurisdictionMap: {
			sets: Set<string>[];
			code: JurisdictionCode;
		}[] = [
			{
				code: 'GDPR',
				sets: [jurisdictions.EU, jurisdictions.EEA, jurisdictions.UK],
			},
			{ code: 'CH', sets: [jurisdictions.CH] },
			{ code: 'BR', sets: [jurisdictions.BR] },
			{ code: 'PIPEDA', sets: [jurisdictions.CA] },
			{ code: 'AU', sets: [jurisdictions.AU] },
			{ code: 'APPI', sets: [jurisdictions.JP] },
			{ code: 'PIPA', sets: [jurisdictions.KR] },
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
};
