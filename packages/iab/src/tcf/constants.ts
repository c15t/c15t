/**
 * IAB TCF constants.
 *
 * @packageDocumentation
 */

/**
 * Storage keys for IAB TCF data.
 *
 * @internal
 */
export const IAB_STORAGE_KEYS = {
	/**
	 * Google Additional Consent string cookie. Named after the `addtl_consent`
	 * URL parameter Google defines for the same value.
	 */
	AC_STRING_COOKIE: 'addtl_consent',

	/** Additional Consent localStorage key. */
	AC_STRING_LOCAL: 'addtl_consent',

	/** TC String cookie name (per TCF spec) */
	TC_STRING_COOKIE: 'euconsent-v2',

	/** TC String localStorage key (use same key as cookie for consistency) */
	TC_STRING_LOCAL: 'euconsent-v2',
} as const;

/**
 * Default GVL endpoint.
 *
 * @internal
 */
export const GVL_ENDPOINT = 'https://gvl.inth.app';
