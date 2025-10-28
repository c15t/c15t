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
export function getDefaultCookieOptions(
	config?: StorageConfig
): Required<CookieOptions> {
	return {
		expiryDays: config?.defaultExpiryDays ?? 365,
		crossSubdomain: config?.crossSubdomain ?? false,
		domain: config?.defaultDomain ?? '',
		path: '/',
		secure:
			typeof window !== 'undefined' && window.location.protocol === 'https:',
		sameSite: 'Lax',
	};
}

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
 * saveConsentToStorage(data, { domain: getRootDomain() });
 * ```
 *
 * @public
 */
export function getRootDomain(): string {
	if (typeof window === 'undefined') {
		return '';
	}

	const hostname = window.location.hostname;

	// Handle localhost and IP addresses
	if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
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
}
