/**
 * @packageDocumentation
 * Domain and configuration utilities for cookie storage.
 *
 * @remarks
 * This module provides helpers for working with cookie domains and
 * default configuration options.
 */

import type { CookieOptions, StorageConfig } from './types';

/**
 * Gets default cookie options (respects config)
 *
 * @param config - Optional storage configuration
 * @returns Complete cookie options with all defaults filled in
 *
 * @internal
 */
export const getDefaultCookieOptions = function getDefaultCookieOptions(
	config?: StorageConfig
): Required<CookieOptions> {
	return {
		crossSubdomain: config?.crossSubdomain ?? false,
		domain: config?.defaultDomain ?? '',
		expiryDays: config?.defaultExpiryDays ?? 365,
		path: '/',
		sameSite: 'Lax',
		secure:
			typeof window !== 'undefined' && window.location.protocol === 'https:',
	};
};

/**
 * The cookie domain {@link getRootDomain} picks for a hostname: the hostname
 * itself for `localhost` and IP addresses, else the last two labels with a
 * leading dot. A server uses it to set a cookie the browser would set.
 *
 * @param hostname - A hostname without a port.
 * @returns Root domain, e.g. `.example.com` for `app.example.com`.
 *
 * @internal
 */
export const rootDomainOf = function rootDomainOf(hostname: string): string {
	// Handle localhost and IP addresses
	if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/u.test(hostname)) {
		return hostname;
	}

	// Split hostname and get last two parts (e.g., example.com)
	const parts = hostname.split('.');

	// Handle edge cases (e.g., co.uk, com.au)
	// For simplicity, just use last two parts
	if (parts.length >= 2) {
		return `.${parts.slice(-2).join('.')}`;
	}

	return hostname;
};

/**
 * Gets the root domain for cross-subdomain cookies.
 *
 * @returns Root domain with leading dot (e.g., '.example.com')
 *
 * @remarks
 * Use this helper to enable consent sharing across all subdomains.
 * For example, if you want consent on app.example.com to apply to www.example.com.
 *
 * @example
 * ```typescript
 * // Enable cross-subdomain consent
 * createPersistence({ kernel, storageConfig: { domain: getRootDomain() } });
 * ```
 *
 * @public
 */
export const getRootDomain = function getRootDomain(): string {
	if (typeof window === 'undefined') {
		return '';
	}
	return rootDomainOf(window.location.hostname);
};
