/**
 * Reset Consents Utility
 * Centralized logic for resetting all consent data
 */

import type { ConsentStoreState } from 'c15t';
import type { StoreApi } from 'zustand';
import type { StateManager } from './state-manager';

/**
 * Storage keys used by c15t that need to be cleared on reset
 */
const STORAGE_KEYS = {
	/** Main c15t consent storage */
	C15T: 'c15t',
	/** Pending consent sync data */
	PENDING_SYNC: 'c15t:pending-consent-sync',
	/** Pending consent submissions */
	PENDING_SUBMISSIONS: 'c15t-pending-consent-submissions',
	/** IAB TCF euconsent string */
	EUCONSENT: 'euconsent-v2',
} as const;

/**
 * Cookie names used by c15t that need to be cleared on reset
 */
const COOKIE_NAMES = {
	/** Main c15t cookie */
	C15T: 'c15t',
	/** IAB TCF euconsent cookie */
	EUCONSENT: 'euconsent-v2',
} as const;

/**
 * Clears a cookie by setting it to expire in the past
 */
function clearCookie(name: string): void {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Clears all c15t-related cookies
 */
function clearAllCookies(): void {
	clearCookie(COOKIE_NAMES.C15T);
	clearCookie(COOKIE_NAMES.EUCONSENT);
}

/**
 * Clears all c15t-related localStorage entries
 */
function clearAllLocalStorage(): void {
	try {
		localStorage.removeItem(STORAGE_KEYS.C15T);
		localStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
		localStorage.removeItem(STORAGE_KEYS.PENDING_SUBMISSIONS);
		localStorage.removeItem(STORAGE_KEYS.EUCONSENT);
	} catch {
		// localStorage might be unavailable
	}
}

/**
 * Resets all consent data including:
 * - Store state via resetConsents()
 * - Cookies (c15t, euconsent-v2)
 * - localStorage entries
 * - Re-initializes the consent manager to reset IAB state
 *
 * @param store - The c15t store instance
 * @param stateManager - Optional state manager for event logging
 */
export async function resetAllConsents(
	store: StoreApi<ConsentStoreState>,
	stateManager?: StateManager
): Promise<void> {
	const storeState = store.getState();

	// Reset store state
	storeState.resetConsents();

	// Clear all storage
	clearAllCookies();
	clearAllLocalStorage();

	// Re-initialize to reset IAB state in memory
	await storeState.initConsentManager();

	// Log event if state manager provided
	stateManager?.addEvent({
		type: 'consent_reset',
		message: 'All consents reset (storage cleared)',
	});
}

/**
 * Creates a reset handler function bound to a store connector
 * This is a convenience wrapper for use in panel callbacks
 */
export function createResetHandler(
	getStore: () => StoreApi<ConsentStoreState> | null,
	stateManager?: StateManager
): () => Promise<void> {
	return async () => {
		const store = getStore();
		if (store) {
			await resetAllConsents(store, stateManager);
		}
	};
}
