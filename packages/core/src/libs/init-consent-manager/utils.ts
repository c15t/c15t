/**
 * Utility functions for consent manager initialization.
 *
 * @packageDocumentation
 */

import type { StoreAccess } from './types';

/**
 * Checks if localStorage is available and accessible.
 *
 * @param set - Store setter to update state if storage is unavailable
 * @returns True if localStorage is accessible, false otherwise
 */
export function checkLocalStorageAccess(set: StoreAccess['set']): boolean {
	try {
		if (window.localStorage) {
			window.localStorage.setItem('c15t-storage-test-key', 'test');
			window.localStorage.removeItem('c15t-storage-test-key');
			return true;
		}
	} catch (error) {
		console.warn('localStorage not available, skipping consent banner:', error);
		set({ isLoadingConsentInfo: false, showPopup: false });
	}
	return false;
}
