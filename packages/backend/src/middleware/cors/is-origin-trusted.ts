/**
 * Origin validation utilities for CORS security
 *
 * @packageDocumentation
 */

import type { Logger } from '@c15t/logger';
import { matchesWildcard } from './matches-wildcard';

/**
 * Regular expression to strip protocol and trailing slashes from URLs.
 * Port numbers are intentionally preserved so entries such as
 * `localhost:3000` do not trust every service on `localhost`.
 *
 * @internal
 */
export const STRIP_REGEX = /^(?:https?:\/\/)|^(?:wss?:\/\/)|(?:\/+$)/g;

/** Regular expression to match www prefix in domain names */
const WWW_REGEX = /^www\./;

/** Regular expression matching a URL scheme prefix (e.g. `https://`) */
const PROTOCOL_REGEX = /^[a-z][a-z\d+.-]*:\/\//i;

/** Default ports for the protocols we accept, used to resolve origins. */
const DEFAULT_PORTS: Record<string, string> = {
	'http:': '80',
	'https:': '443',
	'ws:': '80',
	'wss:': '443',
};

interface NormalizedTrustedDomain {
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
function extractExplicitPort(authority: string): string | undefined {
	// IPv6 literals carry the port after the closing bracket: [::1]:3000
	const ipv6 = authority.match(/^\[[^\]]+\](?::(\d+))?$/);
	if (ipv6) {
		return ipv6[1] || undefined;
	}

	const match = authority.match(/:(\d+)$/);
	return match ? match[1] : undefined;
}

function normalizeTrustedDomain(
	domain: string
): NormalizedTrustedDomain | null {
	const trimmed = domain.trim();
	if (!trimmed) {
		return null;
	}

	const hasProtocol = PROTOCOL_REGEX.test(trimmed);
	const withoutProtocol = trimmed.replace(PROTOCOL_REGEX, '');
	// The authority is everything before the first path/query/fragment marker.
	const authority = withoutProtocol.split(/[/?#]/)[0] ?? '';

	try {
		const parsed = new URL(hasProtocol ? trimmed : `https://${authority}`);

		return {
			hostname: parsed.hostname.toLowerCase(),
			// Read the port from the raw input rather than `parsed.port`, which
			// drops scheme-default ports such as `:443` on https.
			port: extractExplicitPort(authority),
		};
	} catch {
		return null;
	}
}

/**
 * Validates if a given origin matches any of the trusted domain patterns
 *
 * Supports:
 * - Exact domain matches
 * - Wildcard subdomains (e.g. *.example.com)
 * - Protocol-agnostic matching
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
export function isOriginTrusted(
	origin: string,
	trustedDomains: string[],
	logger?: Logger
): boolean {
	try {
		if (trustedDomains.length === 0) {
			throw new Error('No trusted domains');
		}

		logger?.debug(
			`Checking if origin ${origin} is trusted in ${trustedDomains}`
		);

		// Special case: if "*" is in trusted domains, allow all origins
		if (trustedDomains.includes('*')) {
			logger?.debug('Allowing all origins');
			return true;
		}

		// Parse the origin URL to get host components
		const url = new URL(origin);
		const originHostname = url.hostname.toLowerCase();
		// Resolve the scheme default (e.g. 443 for https) so a trusted entry
		// like `example.com:443` still matches `https://example.com`.
		const originPort = url.port || DEFAULT_PORTS[url.protocol] || undefined;
		logger?.debug(`Parsed origin hostname: ${originHostname}`);

		return trustedDomains.some((domain) => {
			// Handle empty domains (which might come from splitting empty strings)
			if (!domain || domain.trim() === '') {
				logger?.debug('Skipping empty domain');
				return false;
			}

			const normalizedDomain = normalizeTrustedDomain(domain);
			if (!normalizedDomain) {
				logger?.debug('Skipping invalid domain');
				return false;
			}

			logger?.debug(
				`Checking against stripped domain: ${normalizedDomain.hostname}`
			);

			if (normalizedDomain.port && normalizedDomain.port !== originPort) {
				logger?.debug(
					`Port mismatch: ${originPort ?? '<default>'} !== ${normalizedDomain.port}`
				);
				return false;
			}

			if (normalizedDomain.hostname.startsWith('*.')) {
				const isMatch = matchesWildcard(
					originHostname,
					normalizedDomain.hostname
				);
				logger?.debug(
					`Wildcard match result: ${isMatch} ${originHostname} matches ${normalizedDomain.hostname}`
				);
				return isMatch;
			}

			const normalizedOriginHostname = originHostname.replace(WWW_REGEX, '');
			const normalizedTrustedHostname = normalizedDomain.hostname.replace(
				WWW_REGEX,
				''
			);
			const isMatch = normalizedOriginHostname === normalizedTrustedHostname;
			logger?.debug(
				`Exact match result: ${isMatch} ${normalizedOriginHostname} === ${normalizedTrustedHostname}`
			);
			return isMatch;
		});
	} catch (error) {
		logger?.error('Error validating origin:', error);
		return false;
	}
}
