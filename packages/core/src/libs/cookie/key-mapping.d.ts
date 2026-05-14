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
export declare const COOKIE_KEY_MAP: {
	readonly consents: 'c';
	readonly consentInfo: 'i';
	readonly timestamp: 'ts';
	readonly iabCustomVendorConsents: 'icv';
	readonly iabCustomVendorLegitimateInterests: 'icvli';
	readonly time: 't';
	readonly type: 'y';
	readonly id: 'id';
	readonly subjectId: 'sid';
	readonly externalId: 'eid';
	readonly materialPolicyFingerprint: 'mpf';
	readonly identityProvider: 'idp';
};
/**
 * Reverse mapping for deserializing cookie data
 *
 * @internal
 */
export declare const REVERSE_COOKIE_KEY_MAP: Record<string, string>;
/**
 * Shortens keys in a flattened object using the key map.
 *
 * @param flattened - Flattened object with full keys
 * @returns Flattened object with shortened keys
 *
 * @internal
 */
export declare function shortenFlatKeys(
	flattened: Record<string, string>
): Record<string, string>;
/**
 * Expands shortened keys in a flattened object back to full keys.
 *
 * @param shortened - Flattened object with shortened keys
 * @returns Flattened object with full keys
 *
 * @internal
 */
export declare function expandFlatKeys(
	shortened: Record<string, string>
): Record<string, string>;
