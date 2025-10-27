/**
 * @packageDocumentation
 * High-level storage operations for consent data.
 *
 * @remarks
 * This module provides dual-storage functionality for consent data,
 * persisting to both localStorage and cookies for maximum reliability.
 */

import type { ConsentState } from '../..';
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../../store.initial-state';
import type { ConsentInfo } from '../../types/gdpr';
import { deleteCookie, getCookie, setCookie } from './operations';
import type { CookieOptions, StorageConfig } from './types';

/**
 * Migrates consent data from legacy storage key to new storage key.
 *
 * @param config - Storage configuration
 *
 * @remarks
 * This function handles automatic migration from v1.7.x storage keys
 * (`privacy-consent-storage`) to v1.8+ storage keys (`c15t`).
 * It removes the old localStorage entry after successful migration.
 *
 * @internal
 */
function migrateLegacyStorage(config?: StorageConfig): void {
	const newKey = config?.storageKey || STORAGE_KEY_V2;
	const legacyKey = STORAGE_KEY;

	// Skip if already using legacy key or if new key already has data
	if (newKey === legacyKey) {
		return;
	}

	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			// Check if new key already has data
			const existingData = window.localStorage.getItem(newKey);
			if (existingData) {
				// New key already has data, just clean up legacy
				window.localStorage.removeItem(legacyKey);
				return;
			}

			// Check for legacy data
			const legacyData = window.localStorage.getItem(legacyKey);
			if (legacyData) {
				// Migrate legacy data to new key
				window.localStorage.setItem(newKey, legacyData);
				// Remove legacy key
				window.localStorage.removeItem(legacyKey);
				console.log(
					`[c15t] Migrated consent data from "${legacyKey}" to "${newKey}"`
				);
			}
		}
	} catch (error) {
		console.warn('[c15t] Failed to migrate legacy storage:', error);
	}
}

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
export function saveConsentToStorage(
	data: {
		consents: Partial<ConsentState>;
		consentInfo: ConsentInfo;
	},
	options?: CookieOptions,
	config?: StorageConfig
): void {
	let localStorageSuccess = false;
	let cookieSuccess = false;

	const storageKey = config?.storageKey || STORAGE_KEY_V2;

	// Save to localStorage
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			window.localStorage.setItem(storageKey, JSON.stringify(data));
			localStorageSuccess = true;
		}
	} catch (error) {
		console.warn('Failed to save consent to localStorage:', error);
	}

	// Save to cookie
	try {
		setCookie(storageKey, data, options, config);
		cookieSuccess = true;
	} catch (error) {
		console.warn('Failed to save consent to cookie:', error);
	}

	if (!localStorageSuccess && !cookieSuccess) {
		throw new Error('Failed to save consent to any storage method');
	}
}

/**
 * Retrieves consent data from localStorage or cookie (with fallback).
 *
 * @typeParam ReturnType - The expected type of the consent data
 *
 * @param config - Storage configuration
 * @returns Consent data or null if not found
 *
 * @remarks
 * Priority order:
 * 1. localStorage with new key (primary)
 * 2. Cookie with new key (fallback)
 * 3. localStorage with legacy key (migration)
 * 4. If localStorage exists but cookie doesn't, sync cookie from localStorage
 *
 * This function automatically handles migration from legacy storage keys.
 *
 * @example
 * ```typescript
 * const consent = getConsentFromStorage();
 * if (consent) {
 *   console.log('Found consent:', consent);
 * }
 * ```
 *
 * @public
 */
export function getConsentFromStorage<ReturnType = unknown>(
	config?: StorageConfig
): ReturnType | null {
	// Attempt migration before reading
	migrateLegacyStorage(config);

	const storageKey = config?.storageKey || STORAGE_KEY_V2;
	let localStorageData: ReturnType | null = null;
	let cookieData: ReturnType | null = null;

	// Try localStorage first
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			const stored = window.localStorage.getItem(storageKey);
			if (stored) {
				localStorageData = JSON.parse(stored) as ReturnType;
			}
		}
	} catch (error) {
		console.warn('Failed to read consent from localStorage:', error);
	}

	// Try cookie as fallback
	try {
		cookieData = getCookie<ReturnType>(storageKey);
	} catch (error) {
		console.warn('Failed to read consent from cookie:', error);
	}

	// If localStorage has data but cookie doesn't, sync the cookie
	if (localStorageData && !cookieData) {
		try {
			setCookie(storageKey, localStorageData, undefined, config);
			console.log('Synced consent from localStorage to cookie');
		} catch (error) {
			console.warn('Failed to sync consent to cookie:', error);
		}
	}

	// Return localStorage data if available, otherwise cookie data
	return localStorageData || cookieData;
}

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
export function deleteConsentFromStorage(
	options?: CookieOptions,
	config?: StorageConfig
): void {
	const storageKey = config?.storageKey || STORAGE_KEY_V2;

	// Remove from localStorage (both new and legacy keys)
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			window.localStorage.removeItem(storageKey);
			// Also remove legacy key if it exists
			if (storageKey !== STORAGE_KEY) {
				window.localStorage.removeItem(STORAGE_KEY);
			}
		}
	} catch (error) {
		console.warn('Failed to remove consent from localStorage:', error);
	}

	// Remove cookie (both new and legacy keys)
	try {
		deleteCookie(storageKey, options, config);
		// Also remove legacy cookie if it exists
		if (storageKey !== STORAGE_KEY) {
			deleteCookie(STORAGE_KEY, options, config);
		}
	} catch (error) {
		console.warn('Failed to remove consent cookie:', error);
	}
}
