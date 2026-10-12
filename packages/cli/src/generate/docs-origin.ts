/** Docs origin for stable releases and release lines without their own site. */
export const C15T_DOCS_ORIGIN = 'https://c15t.com';

/**
 * Docs sites for the prereleases of a new major version, keyed by major.
 * c15t.com documents the current stable major until the new one ships.
 */
const PRERELEASE_DOCS_ORIGINS: ReadonlyMap<string, string> = new Map([
	['3', 'https://v3.c15t.com'],
]);

/**
 * The docs site for a c15t release. Prereleases of a new major
 * (`3.0.0-alpha.3`) have their own site, such as https://v3.c15t.com, while
 * c15t.com still documents the previous major. Everything else uses
 * https://c15t.com.
 *
 * This module imports nothing, so repository scripts can use it without a
 * built CLI.
 *
 * @param version - A c15t package version.
 * @returns An origin without a trailing slash.
 *
 * @example
 * ```ts
 * docsOriginForVersion('3.0.0-alpha.3'); // 'https://v3.c15t.com'
 * docsOriginForVersion('3.2.1'); // 'https://c15t.com'
 * ```
 */
export const docsOriginForVersion = function docsOriginForVersion(
	version: string
): string {
	const separator = version.indexOf('-');
	if (separator === -1) {
		return C15T_DOCS_ORIGIN;
	}
	const [major = '', minor, patch] = version.slice(0, separator).split('.');
	if (minor !== '0' || patch !== '0') {
		return C15T_DOCS_ORIGIN;
	}
	return PRERELEASE_DOCS_ORIGINS.get(major) ?? C15T_DOCS_ORIGIN;
};
