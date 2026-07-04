import { getRegionFromHeaders, headersToRecord } from '@c15t/schema/geo';
import type { C15TOptions } from '~/types';
import type { JurisdictionCode } from '~/types/api';

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
		CA_QC_REGIONS: new Set([
			// Quebec (Law 25)
			'QC',
		]),
	};

	// Default to no jurisdiction
	let jurisdiction: JurisdictionCode = 'NONE';

	// Check country/region codes against jurisdiction sets
	if (countryCode) {
		// Normalize for case-insensitive comparison
		const normalizedCountryCode = countryCode.toUpperCase();
		// Normalize region code: handle dash-separated formats like "CA-QC" or "US-CA"
		// by extracting the last segment as the subdivision code
		const normalizedRegionCode =
			regionCode && typeof regionCode === 'string'
				? (regionCode.includes('-')
						? regionCode.split('-').pop()!
						: regionCode
					).toUpperCase()
				: null;

		// CCPA-style rules: currently applied for certain US regions only
		if (
			normalizedCountryCode === 'US' &&
			normalizedRegionCode &&
			jurisdictions.US_CCPA_REGIONS.has(normalizedRegionCode)
		) {
			return 'CCPA';
		}

		// Quebec (Law 25): opt-in consent required
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

/**
 * Gets the location from the request headers.
 *
 * @param request - The incoming request
 * @param options - The C15T options
 * @returns The location object with countryCode and regionCode
 */
export async function getLocation(
	request: Request,
	options: Pick<C15TOptions, 'disableGeoLocation'>
): Promise<{ countryCode: string | null; regionCode: string | null }> {
	if (options.disableGeoLocation) {
		return { countryCode: null, regionCode: null };
	}

	const { country, region } = getRegionFromHeaders(
		headersToRecord(request.headers)
	);
	return { countryCode: country ?? null, regionCode: region ?? null };
}

/**
 * Gets the jurisdiction based on location and options.
 *
 * @param location - The location object
 * @param options - The C15T options
 * @returns The jurisdiction code
 */
export function getJurisdiction(
	location: { countryCode: string | null; regionCode: string | null },
	options: Pick<C15TOptions, 'disableGeoLocation'>
): JurisdictionCode {
	if (options.disableGeoLocation) {
		return 'GDPR';
	}

	return checkJurisdiction(location.countryCode, location.regionCode);
}
