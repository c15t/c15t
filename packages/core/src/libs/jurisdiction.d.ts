import type { JurisdictionCode } from '@c15t/schema/types';
/**
 * Determines the jurisdiction code based on the provided country code.
 *
 * @remarks
 * This mirrors the backend jurisdiction logic and returns only the
 * jurisdiction code. Banner visibility is derived elsewhere using
 * `jurisdiction !== 'NONE'`.
 */
export declare function checkJurisdiction(
	countryCode: string | null,
	regionCode?: string | null
): JurisdictionCode;
