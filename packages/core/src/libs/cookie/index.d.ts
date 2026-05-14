/**
 * @packageDocumentation
 * Cookie storage utilities for consent data persistence.
 *
 * @remarks
 * This module handles dual storage of consent in both localStorage and cookies
 * to ensure persistence across different scenarios.
 *
 * The implementation is split into several focused modules:
 * - `types`: Type definitions and interfaces
 * - `domain-utils`: Domain and configuration helpers
 * - `key-mapping`: Cookie key compression for size optimization
 * - `serialization`: Flattening/unflattening of nested objects
 * - `operations`: Low-level cookie CRUD operations
 * - `storage`: High-level storage functions for consent data
 *
 * @example
 * ```typescript
 * import {
 *   saveConsentToStorage,
 *   getConsentFromStorage,
 *   deleteConsentFromStorage,
 *   getRootDomain
 * } from '@/libs/cookie';
 *
 * // Save consent
 * saveConsentToStorage({
 *   consents: { necessary: true, analytics: false },
 *   consentInfo: { time: Date.now(), type: 'custom' }
 * });
 *
 * // Retrieve consent
 * const consent = getConsentFromStorage();
 *
 * // Delete consent
 * deleteConsentFromStorage();
 * ```
 */
export { getDefaultCookieOptions, getRootDomain } from './domain-utils';
export {
	COOKIE_KEY_MAP,
	expandFlatKeys,
	REVERSE_COOKIE_KEY_MAP,
	shortenFlatKeys,
} from './key-mapping';
export { deleteCookie, getCookie, setCookie } from './operations';
export {
	flatToString,
	flattenObject,
	stringToFlat,
	unflattenObject,
} from './serialization';
export {
	deleteConsentFromStorage,
	getConsentFromStorage,
	saveConsentToStorage,
} from './storage';
export type { CookieOptions, StorageConfig } from './types';
