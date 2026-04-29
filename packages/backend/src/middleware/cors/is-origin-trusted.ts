/**
 * Origin validation utilities for CORS security
 *
 * @packageDocumentation
 */

import type { Logger } from '@c15t/logger';
import { matchesWildcard } from './matches-wildcard';

/**
 * Regular expression to strip protocol, trailing slashes, and port numbers from URLs
 * Matches:
 * - http:// or https:// protocol
 * - ws:// or wss:// protocol
 * - trailing slashes
 * - port numbers with colon
 *
 * @internal
 */
export const STRIP_REGEX =
	/^(?:https?:\/\/)|^(?:wss?:\/\/)|(?:\/+$)|(?::\d+$)/g;

/** Regular expression to match www prefix in domain names */
const WWW_REGEX = /^www\./;

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

		// Parse the origin URL to get just the hostname
		const url = new URL(origin);
		const originHostname = url.hostname.toLowerCase();
		logger?.debug(`Parsed origin hostname: ${originHostname}`);

		return trustedDomains.some((domain) => {
			// Handle empty domains (which might come from splitting empty strings)
			if (!domain || domain.trim() === '') {
				logger?.debug('Skipping empty domain');
				return false;
			}

			const strippedDomain = domain.replace(STRIP_REGEX, '').toLowerCase();
			logger?.debug(`Checking against stripped domain: ${strippedDomain}`);

			if (strippedDomain.startsWith('*.')) {
				const isMatch = matchesWildcard(originHostname, strippedDomain);
				logger?.debug(
					`Wildcard match result: ${isMatch} ${originHostname} matches ${strippedDomain}`
				);
				return isMatch;
			}

			const normalizedOriginHostname = originHostname.replace(WWW_REGEX, '');
			const normalizedDomain = strippedDomain.replace(WWW_REGEX, '');
			const isMatch = normalizedOriginHostname === normalizedDomain;
			logger?.debug(
				`Exact match result: ${isMatch} ${normalizedOriginHostname} === ${normalizedDomain}`
			);
			return isMatch;
		});
	} catch (error) {
		logger?.error('Error validating origin:', error);
		return false;
	}
}
