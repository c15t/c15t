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
export declare function getDefaultCookieOptions(
	config?: StorageConfig
): Required<CookieOptions>;
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
export declare function getRootDomain(): string;
