/**
 * @packageDocumentation
 * Cookie key mapping for storage optimization.
 *
 * @remarks
 * This module handles compression of cookie keys to reduce cookie size
 * while keeping consent keys readable.
 */

/**
 * Mapping of full keys to shortened keys for cookie storage optimization.
 * Keeps consent keys readable but shortens metadata to reduce cookie size.
 *
 * @internal
 */
export const COOKIE_KEY_MAP = {
	consentInfo: 'i',
	// Top-level keys
	// New in v2.0: client-generated subject ID
	consents: 'c',
	externalId: 'eid',
	iabCustomVendorConsents: 'icv',
	iabCustomVendorLegitimateInterests: 'icvli',
	// Material active-policy fingerprint
	id: 'id',
	// The identity provider (e.g., 'clerk', 'auth0')
	identityProvider: 'idp',
	// The external user ID
	// Legacy: consentId (deprecated in v2.0)
	materialPolicyFingerprint: 'mpf',
	subjectId: 'sid',
	// ConsentInfo keys
	time: 't',
	timestamp: 'ts',
	type: 'y',
} as const;

/**
 * Reverse mapping for deserializing cookie data
 *
 * @internal
 */
export const REVERSE_COOKIE_KEY_MAP = Object.entries(COOKIE_KEY_MAP).reduce(
	(acc, [key, value]) => {
		acc[value] = key;
		return acc;
	},
	{} as Record<string, string>
);

/**
 * Shortens keys in a flattened object using the key map.
 *
 * @param flattened - Flattened object with full keys
 * @returns Flattened object with shortened keys
 *
 * @internal
 */
export const shortenFlatKeys = function shortenFlatKeys(
	flattened: Record<string, string>
): Record<string, string> {
	const shortened: Record<string, string> = {};

	for (const [key, value] of Object.entries(flattened)) {
		const keys = key.split('.');
		const shortenedKeys = keys.map(
			(k) => COOKIE_KEY_MAP[k as keyof typeof COOKIE_KEY_MAP] || k
		);
		shortened[shortenedKeys.join('.')] = value;
	}

	return shortened;
};

/**
 * Expands shortened keys in a flattened object back to full keys.
 *
 * @param shortened - Flattened object with shortened keys
 * @returns Flattened object with full keys
 *
 * @internal
 */
export const expandFlatKeys = function expandFlatKeys(
	shortened: Record<string, string>
): Record<string, string> {
	const expanded: Record<string, string> = {};

	for (const [key, value] of Object.entries(shortened)) {
		const keys = key.split('.');
		const expandedKeys = keys.map((k) => REVERSE_COOKIE_KEY_MAP[k] || k);
		expanded[expandedKeys.join('.')] = value;
	}

	return expanded;
};
