import type { LocationInfo } from '~/types/compliance';

export type Model = 'opt-in' | 'opt-out' | null;

/**
 * Determines what type of consent model to use based on the jurisdiction
 *
 * - 'opt-in' - Requires explicit consent before non-essential cookies or tracking. (GDPR Style)
 * - 'opt-out' - Allows processing until the user exercises a right to opt out. (CCPA Style)
 *
 * @param jurisdiction
 */
export function determineModel(
	jurisdiction: LocationInfo['jurisdiction']
): Model {
	if (jurisdiction === null || jurisdiction === 'NONE') {
		return null;
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
