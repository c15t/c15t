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
export function determineModel(
	jurisdiction: LocationInfo['jurisdiction'],
	iabEnabled?: boolean
): Model {
	if (
		jurisdiction === null ||
		jurisdiction === undefined ||
		jurisdiction === 'NONE'
	) {
		return null;
	}

	// IAB TCF mode: only for GDPR jurisdictions when explicitly enabled
	// IAB TCF is primarily designed for EU/UK GDPR compliance
	if (iabEnabled && ['UK_GDPR', 'GDPR'].includes(jurisdiction)) {
		return 'iab';
	}

	// Opt-in model jurisdictions: require explicit consent before
	// non-essential cookies or tracking (stricter regimes).
	if (
		['UK_GDPR', 'GDPR', 'CH', 'BR', 'APPI', 'PIPA', 'PIPEDA'].includes(
			jurisdiction
		)
	) {
		return 'opt-in';
	}

	// Opt-out model jurisdictions: allow processing until the user
	// exercises a right to opt out (e.g. CCPA-style).
	if (['CCPA', 'AU'].includes(jurisdiction)) {
		return 'opt-out';
	}

	// For unknown jurisdictions, default to the stricter opt-in model.
	return 'opt-in';
}
