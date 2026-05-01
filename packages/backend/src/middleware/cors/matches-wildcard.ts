/**
 * Shared wildcard matching utilities for CORS origin checks.
 *
 * @packageDocumentation
 */

/**
 * Checks if an origin matches a wildcard domain pattern.
 *
 * @param origin - Hostname or normalized origin to check
 * @param wildcardPattern - Wildcard pattern (e.g. *.example.com)
 * @returns true if the origin is a subdomain of the wildcard pattern
 */
export function matchesWildcard(
	origin: string,
	wildcardPattern: string
): boolean {
	const wildcardDomain = wildcardPattern.slice(2);

	return origin !== wildcardDomain && origin.endsWith(`.${wildcardDomain}`);
}
