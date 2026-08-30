import type { JurisdictionCode } from './policy-runtime';

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
		US_CCPA_REGIONS: new Set(['CA']),
		CA_QC_REGIONS: new Set(['QC']),
	};

	let jurisdiction: JurisdictionCode = 'NONE';

	if (countryCode) {
		const normalizedCountryCode = countryCode.toUpperCase();
		const normalizedRegionCode =
			regionCode && typeof regionCode === 'string'
				? (regionCode.includes('-')
						? getDefined(regionCode.split('-').pop())
						: regionCode
					).toUpperCase()
				: null;

		if (
			normalizedCountryCode === 'US' &&
			normalizedRegionCode &&
			jurisdictions.US_CCPA_REGIONS.has(normalizedRegionCode)
		) {
			return 'CCPA';
		}

		if (
			normalizedCountryCode === 'CA' &&
			normalizedRegionCode &&
			jurisdictions.CA_QC_REGIONS.has(normalizedRegionCode)
		) {
			return 'QC_LAW25';
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

		for (const { sets, code } of jurisdictionMap) {
			if (sets.some((set) => set.has(normalizedCountryCode))) {
				jurisdiction = code;
				break;
			}
		}
	}

	return jurisdiction;
}

export function getJurisdictionFromLocation(
	location: { countryCode: string | null; regionCode: string | null },
	options?: { disableGeoLocation?: boolean }
): JurisdictionCode {
	if (options?.disableGeoLocation) {
		return 'GDPR';
	}

	return checkJurisdiction(location.countryCode, location.regionCode);
}
