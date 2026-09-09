/** Cookie operations and storage configuration. Consent records are read through the persistence module. */
export { getDefaultCookieOptions, getRootDomain } from './domain-utils';
// Re-export key mapping (internal use)
export {
	COOKIE_KEY_MAP,
	expandFlatKeys,
	REVERSE_COOKIE_KEY_MAP,
	shortenFlatKeys,
} from './key-mapping';
// Re-export cookie operations
export {
	deleteCookie,
	getCookie,
	getRawCookieValue,
	parseCookieValue,
	readCookieValueFromHeader,
	setCookie,
	writeCookie,
} from './operations';
export type { CookieWriteReport } from './operations';

// Re-export serialization (internal use)
export {
	flatToString,
	flattenObject,
	stringToFlat,
	unflattenObject,
} from './serialization';
// Re-export high-level storage functions
export { deleteConsentFromStorage } from './storage';
// Re-export types
export type { CookieOptions, StorageConfig } from './types';
