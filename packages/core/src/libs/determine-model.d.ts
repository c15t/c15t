import type { LocationInfo } from '~/types/compliance';
export type Model = 'opt-in' | 'opt-out' | 'iab' | null;
/**
 * Determines what type of consent model to use based on the jurisdiction
 *
 * - 'opt-in' - Requires explicit consent before non-essential cookies or tracking. (GDPR Style)
 * - 'opt-out' - Allows processing until the user exercises a right to opt out. (CCPA Style)
 * - 'iab' - IAB TCF 2.3 mode for programmatic advertising compliance. (GDPR jurisdictions only)
 *
 * @param jurisdiction - The user's jurisdiction
 * @param iabEnabled - Whether IAB TCF mode is enabled in configuration
 */
export declare function determineModel(
	jurisdiction: LocationInfo['jurisdiction'],
	iabEnabled?: boolean
): Model;
