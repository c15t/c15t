/**
 * @packageDocumentation
 * High-level storage operations for consent data.
 *
 * @remarks
 * This module provides dual-storage functionality for consent data,
 * persisting to both localStorage and cookies for maximum reliability.
 */
import type { ConsentState } from '../..';
import { type ConsentInfo } from '../../types/consent-types';
import type { CookieOptions, StorageConfig } from './types';
/**
 * Saves consent data to both localStorage and cookie.
 *
 * @param data - Consent data to save
 * @param options - Cookie configuration options
 * @param config - Storage configuration
 *
 * @remarks
 * This function ensures dual persistence of consent data for maximum reliability.
 *
 * @throws {Error} When neither storage method succeeds
 *
 * @example
 * ```typescript
 * saveConsentToStorage({
 *   consents: { necessary: true, analytics: false },
 *   consentInfo: { time: Date.now(), type: 'custom' }
 * });
 * ```
 *
 * @public
 */
export declare function saveConsentToStorage(
	data: {
		consents: Partial<ConsentState>;
		consentInfo: ConsentInfo;
		iabCustomVendorConsents?: Record<string, boolean>;
		iabCustomVendorLegitimateInterests?: Record<string, boolean>;
	},
	options?: CookieOptions,
	config?: StorageConfig
): void;
/**
 * Retrieves consent data from localStorage or cookie (with fallback).
 *
 * @typeParam ReturnType - The expected type of the consent data
 *
 * @param config - Storage configuration
 * @returns Consent data or null if not found
 *
 * @remarks
 * Priority order (optimized for performance):
 * 1. Cookie (if exists) - cookies are more reliable and work across subdomains
 * 2. localStorage (if cookie doesn't exist) - fallback for single-domain scenarios
 *
 * This function automatically:
 * - Handles migration from legacy storage keys
 * - Always prioritizes cookies when both sources exist (better performance, no timestamp comparison)
 * - Syncs from the chosen source to the other storage location
 * - Normalizes consent data to ensure all consent values are explicit booleans
 * - Defaults missing consent keys to `false` (important for optimized cookie storage)
 *
 * This is especially important for cross-subdomain scenarios where:
 * - Cookies are shared across subdomains (e.g., `domain=.example.com`)
 * - localStorage is subdomain-specific
 * - Consent updated on one subdomain should be reflected on all subdomains
 *
 * Performance: Cookies are always prioritized when both exist to avoid timestamp comparison overhead.
 *
 * @example
 * ```typescript
 * const consent = getConsentFromStorage();
 * if (consent) {
 *   // All consent values are guaranteed to be explicit booleans
 *   console.log('Analytics consent:', consent.consents.analytics); // true or false, never undefined
 * }
 * ```
 *
 * @public
 */
export declare function getConsentFromStorage<ReturnType = unknown>(
	config?: StorageConfig
): ReturnType | null;
/**
 * Deletes consent data from both localStorage and cookie.
 *
 * @param options - Cookie configuration options
 * @param config - Storage configuration
 *
 * @remarks
 * This ensures complete removal of consent data from all storage locations,
 * including legacy storage keys.
 *
 * @example
 * ```typescript
 * deleteConsentFromStorage();
 * ```
 *
 * @public
 */
export declare function deleteConsentFromStorage(
	options?: CookieOptions,
	config?: StorageConfig
): void;
