/**
 * Reset Consents Utility
 * Centralized logic for resetting all consent data
 */

import type { ConsentKernel, ConsentState } from '@c15t/core';

import type { StateManager } from './state-manager';

/**
 * Storage keys used by c15t that need to be cleared on reset
 */
const STORAGE_KEYS = {
	/** Main c15t consent storage */
	C15T: 'c15t',
	/** IAB TCF euconsent string */
	EUCONSENT: 'euconsent-v2',
	/** Legacy consent storage key */
	LEGACY: 'privacy-consent-storage',
	/** Failed consent saves waiting for a backend replay */
	PENDING_SAVES: 'c15t-v3-pending-consent-saves:v1',
	/** Pending consent submissions */
	PENDING_SUBMISSIONS: 'c15t-pending-consent-submissions',
	/** Pending consent sync data */
	PENDING_SYNC: 'c15t:pending-consent-sync',
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
const clearCookie = function clearCookie(name: string): void {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

/**
 * Clears all c15t-related cookies
 */
const clearAllCookies = function clearAllCookies(): void {
	clearCookie(COOKIE_NAMES.C15T);
	clearCookie(COOKIE_NAMES.EUCONSENT);
};

/**
 * Clears all c15t-related localStorage entries
 */
const clearAllLocalStorage = function clearAllLocalStorage(): void {
	try {
		localStorage.removeItem(STORAGE_KEYS.C15T);
		localStorage.removeItem(STORAGE_KEYS.LEGACY);
		localStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
		localStorage.removeItem(STORAGE_KEYS.PENDING_SUBMISSIONS);
		localStorage.removeItem(STORAGE_KEYS.PENDING_SAVES);
		localStorage.removeItem(STORAGE_KEYS.EUCONSENT);
	} catch {
		// localStorage might be unavailable
	}
};

/**
 * Builds the consent record a fresh kernel starts from: every category off
 * except `necessary`.
 */
const buildDefaultConsents = function buildDefaultConsents(
	current: Readonly<ConsentState>
): Partial<ConsentState> {
	const defaults: Partial<ConsentState> = {};
	for (const name of Object.keys(current) as (keyof ConsentState)[]) {
		defaults[name] = name === 'necessary';
	}
	return defaults;
};

/**
 * Resets all consent data including:
 * - Kernel state (consents back to defaults, `hasConsented` off, subject ID cleared)
 * - Cookies (c15t, euconsent-v2)
 * - localStorage entries
 * - Re-runs init so policy-derived state (banner, IAB) is rebuilt
 *
 * @param kernel - The consent kernel
 * @param stateManager - Optional state manager for event logging
 */
export const resetAllConsents = async function resetAllConsents(
	kernel: ConsentKernel,
	stateManager?: StateManager
): Promise<void> {
	const snapshot = kernel.getSnapshot();

	kernel.set.consent(buildDefaultConsents(snapshot.consents));
	kernel.set.hasConsented(false);
	kernel.set.subjectId(null);
	if (snapshot.iab) {
		kernel.set.iab({
			purposeConsents: {},
			purposeLegitimateInterests: {},
			specialFeatureOptIns: {},
			tcString: null,
			vendorConsents: {},
			vendorLegitimateInterests: {},
		});
	}

	// Clear all storage
	clearAllCookies();
	clearAllLocalStorage();

	// Re-run init so the banner and policy state come back
	await kernel.commands.init();

	// Log event if state manager provided
	stateManager?.addEvent({
		message: 'All consents reset (storage cleared)',
		type: 'consent_reset',
	});
};

/**
 * Creates a reset handler function bound to a kernel getter
 * This is a convenience wrapper for use in panel callbacks
 */
export const createResetHandler = function createResetHandler(
	getKernel: () => ConsentKernel | null,
	stateManager?: StateManager
): () => Promise<void> {
	return async () => {
		const kernel = getKernel();
		if (kernel) {
			await resetAllConsents(kernel, stateManager);
		}
	};
};
