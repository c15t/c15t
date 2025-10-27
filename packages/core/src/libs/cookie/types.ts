/**
 * @packageDocumentation
 * Type definitions for cookie storage functionality.
 *
 * @remarks
 * This module contains all type definitions and interfaces used across
 * the cookie storage implementation.
 */

/**
 * Storage configuration options
 *
 * @remarks
 * Configure storage behavior through store options for better control
 * and testability.
 *
 * @example
 * ```typescript
 * import { createConsentManagerStore } from 'c15t';
 *
 * const store = createConsentManagerStore(client, {
 *   storageConfig: {
 *     storageKey: 'my-consent-storage',
 *     crossSubdomain: true,
 *     defaultExpiryDays: 180
 *   }
 * });
 * ```
 *
 * @public
 */
export interface StorageConfig {
	/**
	 * Custom storage key for localStorage and cookies
	 *
	 * @default 'c15t'
	 *
	 * @remarks
	 * The default changed from 'privacy-consent-storage' to 'c15t' in v1.8+
	 * to reduce cookie size. Legacy data is automatically migrated.
	 *
	 * Change this if you need to:
	 * - Avoid conflicts with other libraries
	 * - Use multiple consent instances
	 * - Migrate from existing storage
	 */
	storageKey?: string;

	/**
	 * Enable cross-subdomain cookies by default
	 *
	 * @default false
	 *
	 * @remarks
	 * When true, cookies will automatically work across all subdomains
	 * (e.g., app.example.com, www.example.com, dashboard.example.com)
	 */
	crossSubdomain?: boolean;

	/**
	 * Custom default domain for cookies
	 *
	 * @default '' (current domain only)
	 *
	 * @remarks
	 * Overrides crossSubdomain if set.
	 * Use '.example.com' for all subdomains.
	 */
	defaultDomain?: string;

	/**
	 * Default cookie expiration in days
	 *
	 * @default 365
	 */
	defaultExpiryDays?: number;
}

/**
 * Configuration options for cookie storage
 *
 * @public
 */
export interface CookieOptions {
	/**
	 * Cookie expiration in days
	 * @default 365
	 */
	expiryDays?: number;

	/**
	 * Enable cross-subdomain cookies
	 *
	 * @default false
	 *
	 * @remarks
	 * Simpler alternative to setting domain explicitly.
	 * Automatically uses getRootDomain() when true.
	 */
	crossSubdomain?: boolean;

	/**
	 * Cookie domain
	 *
	 * @remarks
	 * - Empty string or undefined: Current domain only (most secure)
	 * - `.example.com`: All subdomains (better UX, less secure)
	 * - `example.com`: Exact domain match
	 *
	 * Takes precedence over crossSubdomain if both are set.
	 *
	 * @default '' (current domain only)
	 *
	 * @example
	 * ```typescript
	 * // Current domain only (default, most secure)
	 * saveConsentToStorage(data);
	 *
	 * // Easy way: Cross-subdomain
	 * saveConsentToStorage(data, { crossSubdomain: true });
	 *
	 * // Advanced: Explicit domain
	 * saveConsentToStorage(data, { domain: '.example.com' });
	 * ```
	 */
	domain?: string;

	/**
	 * Cookie path
	 * @default '/'
	 */
	path?: string;

	/**
	 * Whether the cookie should be secure (HTTPS only)
	 * @default true in production
	 */
	secure?: boolean;

	/**
	 * SameSite attribute for the cookie
	 * @default 'Lax'
	 */
	sameSite?: 'Strict' | 'Lax' | 'None';
}
