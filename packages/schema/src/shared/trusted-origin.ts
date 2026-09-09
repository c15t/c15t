/**
 * Origin allowlisting for CORS.
 *
 * Shared rather than duplicated because it is a security decision. During RFC
 * 0004's parallel phase both backends answer for the same tenants with the
 * same configured trusted domains, and an origin accepted by one but rejected
 * by the other is either a hole or an outage depending on direction.
 *
 * The matching is also subtler than it looks — IPv6 literals carry their port
 * after the bracket, default ports are implicit per scheme, `www.` is treated
 * as equivalent, and `*.` wildcards deliberately exclude the apex — so a
 * second implementation would drift on an edge case rather than obviously.
 */

import { getAppScheme } from './app-scheme';

/** Just enough of a logger to trace a decision, without a dependency. */
export interface LoggerLike {
	debug?: (message: string, ...rest: unknown[]) => void;
	warn?: (message: string, ...rest: unknown[]) => void;
	error?: (message: string, ...rest: unknown[]) => void;
}

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
export const matchesWildcard = function matchesWildcard(
	origin: string,
	wildcardPattern: string
): boolean {
	const wildcardDomain = wildcardPattern.slice(2);

	return origin !== wildcardDomain && origin.endsWith(`.${wildcardDomain}`);
};

/**
 * Origin validation utilities for CORS security
 *
 * @packageDocumentation
 */

/** Regular expression to match www prefix in domain names */
const WWW_REGEX = /^www\./u;

/** Regular expression matching a URL scheme prefix (e.g. `https://`) */
const PROTOCOL_REGEX = /^[a-z][a-z\d+.-]*:\/\//iu;

/** Default ports for the protocols we accept, used to resolve origins. */
const DEFAULT_PORTS: Record<string, string> = {
	'http:': '80',
	'https:': '443',
	'ws:': '80',
	'wss:': '443',
};

interface NormalizedTrustedDomain {
	/**
	 * Non-web scheme the entry is pinned to (e.g. `capacitor:`), or `undefined`
	 * when the entry is protocol-agnostic.
	 */
	scheme?: string;
	hostname: string;
	port?: string;
}

/**
 * Extracts an explicitly written port from an authority component.
 *
 * Unlike `URL.port`, this preserves default ports (e.g. `:443`) because the
 * port was deliberately configured and should still scope the origin.
 *
 * @internal
 */
const extractExplicitPort = function extractExplicitPort(
	authority: string
): string | undefined {
	// IPv6 literals carry the port after the closing bracket: [::1]:3000
	// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
	const ipv6 = authority.match(/^\[[^\]]+\](?::(\d+))?$/u);
	if (ipv6) {
		return ipv6[1] || undefined;
	}

	// oxlint-disable-next-line prefer-named-capture-group -- Preserve declaration order, interface shape, and public compatibility.
	const match = authority.match(/:(\d+)$/u);
	return match ? match[1] : undefined;
};

const normalizeTrustedDomain = function normalizeTrustedDomain(
	domain: string
): NormalizedTrustedDomain | null {
	const trimmed = domain.trim();
	if (!trimmed) {
		return null;
	}

	const hasProtocol = PROTOCOL_REGEX.test(trimmed);
	const withoutProtocol = trimmed.replace(PROTOCOL_REGEX, '');
	// The authority is everything before the first path/query/fragment marker.
	const authority = withoutProtocol.split(/[/?#]/u)[0] ?? '';

	try {
		const parsed = new URL(hasProtocol ? trimmed : `https://${authority}`);

		return {
			hostname: parsed.hostname.toLowerCase(),
			// Read the port from the raw input rather than `parsed.port`, which
			// drops scheme-default ports such as `:443` on https.
			port: extractExplicitPort(authority),
			// Pin the entry to its scheme only when it is an app scheme, so
			// existing http/https/bare-host entries stay protocol-agnostic.
			scheme: getAppScheme(trimmed),
		};
	} catch {
		return null;
	}
};

/**
 * Compares the host halves once scheme and port have already agreed.
 *
 * @internal
 */
const matchesHostname = function matchesHostname(
	originHostname: string,
	trusted: NormalizedTrustedDomain,
	logger?: LoggerLike
): boolean {
	if (trusted.hostname.startsWith('*.')) {
		const isMatch = matchesWildcard(originHostname, trusted.hostname);
		logger?.debug?.(
			`Wildcard match result: ${isMatch} ${originHostname} matches ${trusted.hostname}`
		);
		return isMatch;
	}

	// `www.` equivalence is a web-domain convention. App-scheme hosts are
	// matched verbatim, so `capacitor://localhost` never trusts the distinct
	// origin `capacitor://www.localhost`.
	const stripWww = !trusted.scheme;
	const normalizedOriginHostname = stripWww
		? originHostname.replace(WWW_REGEX, '')
		: originHostname;
	const normalizedTrustedHostname = stripWww
		? trusted.hostname.replace(WWW_REGEX, '')
		: trusted.hostname;
	const isMatch = normalizedOriginHostname === normalizedTrustedHostname;
	logger?.debug?.(
		`Exact match result: ${isMatch} ${normalizedOriginHostname} === ${normalizedTrustedHostname}`
	);
	return isMatch;
};

interface ParsedOrigin {
	hostname: string;
	port?: string;
	/** `undefined` for web origins; `capacitor:` and friends for app origins. */
	scheme?: string;
}

/**
 * Decides whether one trusted-domain entry covers a parsed origin.
 *
 * @internal
 */
const matchesTrustedDomain = function matchesTrustedDomain(
	origin: ParsedOrigin,
	domain: string,
	logger?: LoggerLike
): boolean {
	// Handle empty domains (which might come from splitting empty strings)
	if (!domain || domain.trim() === '') {
		logger?.debug?.('Skipping empty domain');
		return false;
	}

	const normalizedDomain = normalizeTrustedDomain(domain);
	if (!normalizedDomain) {
		logger?.debug?.('Skipping invalid domain');
		return false;
	}

	logger?.debug?.(
		`Checking against stripped domain: ${normalizedDomain.hostname}`
	);

	// An entry that names an app scheme is pinned to it: `capacitor://localhost`
	// and `https://localhost` are different origins. Entries without one stay
	// protocol-agnostic, matching any scheme exactly as they always have.
	if (normalizedDomain.scheme && normalizedDomain.scheme !== origin.scheme) {
		logger?.debug?.(
			`Scheme mismatch: ${origin.scheme ?? '<web>'} !== ${normalizedDomain.scheme}`
		);
		return false;
	}

	if (normalizedDomain.port && normalizedDomain.port !== origin.port) {
		logger?.debug?.(
			`Port mismatch: ${origin.port ?? '<default>'} !== ${normalizedDomain.port}`
		);
		return false;
	}

	return matchesHostname(origin.hostname, normalizedDomain, logger);
};

/**
 * Validates if a given origin matches any of the trusted domain patterns
 *
 * Supports:
 * - Exact domain matches
 * - Wildcard subdomains (e.g. *.example.com)
 * - Protocol-agnostic matching for web schemes and bare hostnames
 * - App-scheme entries (e.g. `capacitor://localhost`) pinned to that scheme
 * - Case-insensitive comparison
 *
 * @param origin - The origin URL to validate (e.g. https://example.com)
 * @param trustedDomains - Array of trusted domain patterns. Can include wildcards (e.g. *.example.com)
 * @param logger - Optional logger for debugging validation process
 *
 * @returns `true` if the origin matches any trusted domain pattern, `false` otherwise
 *
 * @throws {Error} When trustedDomains array is empty
 * @throws {TypeError} When origin URL is invalid
 *
 * @example
 * ```ts
 * // Simple domain matching
 * isOriginTrusted('https://example.com', ['example.com']); // true
 *
 * // Wildcard subdomain matching
 * isOriginTrusted('https://api.example.com', ['*.example.com']); // true
 *
 * // Allow all origins
 * isOriginTrusted('https://any-domain.com', ['*']); // true
 * ```
 */
export const isOriginTrusted = function isOriginTrusted(
	origin: string,
	trustedDomains: string[],
	logger?: LoggerLike
): boolean {
	try {
		if (trustedDomains.length === 0) {
			throw new Error('No trusted domains');
		}

		logger?.debug?.(
			`Checking if origin ${origin} is trusted in ${trustedDomains}`
		);

		// Special case: if "*" is in trusted domains, allow all origins
		if (trustedDomains.includes('*')) {
			logger?.debug?.('Allowing all origins');
			return true;
		}

		// Parse the origin URL to get host components
		const url = new URL(origin);
		const originHostname = url.hostname.toLowerCase();
		// `undefined` for ordinary web origins; `capacitor:` and friends for
		// native WebView origins, which only ever match a same-scheme entry.
		const originScheme = getAppScheme(origin);
		// Resolve the scheme default (e.g. 443 for https) so a trusted entry
		// like `example.com:443` still matches `https://example.com`.
		const originPort = url.port || DEFAULT_PORTS[url.protocol] || undefined;
		logger?.debug?.(`Parsed origin hostname: ${originHostname}`);

		return trustedDomains.some((domain) =>
			matchesTrustedDomain(
				{ hostname: originHostname, port: originPort, scheme: originScheme },
				domain,
				logger
			)
		);
	} catch (error) {
		logger?.error?.('Error validating origin:', error);
		return false;
	}
};
