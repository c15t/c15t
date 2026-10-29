/**
 * The domains a consent save may name.
 *
 * A save's `domain` is chosen by the client, and the first save naming one
 * creates its row in the `domain` table. `allowedDomains` limits that to the
 * sites a deployment serves. Entries go through `isOriginTrusted`, the same
 * matcher `trustedOrigins` uses, so the two lists read alike: `*.example.com`
 * covers subdomains but not the apex, `www.` is equivalent, and `*` covers
 * every host.
 */

import { isOriginTrusted } from '@c15t/schema/geo';

/**
 * Whether a save's `domain` is one the instance records consent for.
 *
 * @param domain - The `domain` the save names.
 * @param allowedDomains - The instance's `allowedDomains`.
 * @returns `true` when `domain` is a bare host, optionally with a port, that
 * an entry covers.
 * @internal
 */
export const isDomainAllowed = function isDomainAllowed(
	domain: string,
	allowedDomains: readonly string[]
): boolean {
	let url: URL;
	try {
		url = new URL(`https://${domain}`);
	} catch {
		return false;
	}
	// Only a bare host names a domain. A value the URL parser reads partly as
	// a path, query, fragment or credentials would otherwise pass on its host
	// alone and then be stored as written.
	if (url.host !== domain.toLowerCase()) {
		return false;
	}
	return isOriginTrusted(url.origin, [...allowedDomains]);
};

/**
 * Refuses an `allowedDomains` setting that cannot mean what was intended.
 *
 * @param options - The instance's options.
 * @throws {TypeError} When `allowedDomains` is set but is not an array of
 * non-empty strings.
 * @throws {Error} When `allowedDomains` is an empty array, which would refuse
 * every save.
 * @internal
 */
export const assertAllowedDomainsOptions =
	function assertAllowedDomainsOptions(options: {
		readonly allowedDomains?: readonly string[];
	}): void {
		// Read as unknown: a JavaScript config can pass anything, and a single
		// string would otherwise be spread into characters.
		const allowed: unknown = options.allowedDomains;
		if (allowed === undefined) {
			return;
		}
		if (
			!Array.isArray(allowed) ||
			allowed.some((entry) => typeof entry !== 'string' || entry.trim() === '')
		) {
			throw new TypeError(
				'[c15t] allowedDomains must be an array of domain names, such as ["example.com", "*.example.com"].'
			);
		}
		if (allowed.length === 0) {
			throw new Error(
				'[c15t] allowedDomains is empty, which would refuse every consent save. List the domains this backend serves, or omit it to accept any domain.'
			);
		}
	};
