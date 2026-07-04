import { getRegionFromHeaders, headersToRecord } from '@c15t/schema/geo';
import { checkJurisdiction as checkJurisdictionShared } from '@c15t/schema/types';
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
	return checkJurisdictionShared(countryCode, regionCode) as JurisdictionCode;
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
