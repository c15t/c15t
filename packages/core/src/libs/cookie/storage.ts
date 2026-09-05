/** Remove current and legacy consent storage keys. */
import { STORAGE_KEY, STORAGE_KEY_V2 } from '../storage-keys';
import { deleteCookie } from './operations';
import type { CookieOptions, StorageConfig } from './types';

export const deleteConsentFromStorage = function deleteConsentFromStorage(
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
};
