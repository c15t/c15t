/**
 * The domains a consent save may name.
 *
 * A save's `domain` is chosen by the client, and the first save naming one
 * creates its row in the `domain` table. With `trustedOrigins` set, a save
 * may name only a site the list covers, so the table holds the sites a
 * deployment trusts. Matching goes through `isOriginTrusted`, as for CORS:
 * `*.example.com` covers subdomains but not the apex, `www.` is equivalent,
 * and `*` covers every host.
 */

import { isOriginTrusted } from '@c15t/schema/geo';

/**
 * An entry's host, without the scheme, port or path an origin carries.
 *
 * The browser sends the page's host name alone, which `isOriginTrusted`
 * reads as port 443 with no app scheme. A `trustedOrigins` entry such as
 * `localhost:3000` or `capacitor://localhost` would otherwise never match it.
 */
const entryHost = (entry: string): string => {
	const authority =
		entry
			.trim()
			.replace(/^[a-z][\d+.a-z-]*:\/\//iu, '')
			.split(/[/?#]/u)[0] ?? '';
	// An IPv6 literal keeps its colons; only a port after `]` goes.
	return authority.startsWith('[')
		? authority.replace(/\]:\d*$/u, ']')
		: authority.replace(/:\d*$/u, '');
};

/**
 * Whether a save's `domain` is one the instance records consent for.
 *
 * @param domain - The `domain` the save names.
 * @param trustedOrigins - The instance's `trustedOrigins`.
 * @returns `true` when `domain` is a bare host, optionally with a port, that
 * an entry covers.
 * @internal
 */
export const isDomainAllowed = function isDomainAllowed(
	domain: string,
	trustedOrigins: readonly string[]
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
	// Compare hostnames because URL normalizes ports, including dropping :443.
	const hostname = domain.replace(/:\d+$/u, '').toLowerCase();
	if (url.hostname !== hostname) {
		return false;
	}
	return isOriginTrusted(url.origin, trustedOrigins.map(entryHost));
};
