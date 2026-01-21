/**
 * IAB TCF mode initialization.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '../../types/iab-tcf';
import type { IABConfig } from '../tcf/types';
import type { StoreAccess } from './types';

/**
 * Initializes IAB TCF mode.
 *
 * This function:
 * 1. Initializes the IAB stub immediately (queues __tcfapi calls)
 * 2. Uses prefetched GVL if available, otherwise fetches from consent.io
 * 3. Initializes the CMP API
 * 4. Loads existing TC String from storage if available
 *
 * @param iab - IAB configuration
 * @param storeAccess - Store getters and setters
 * @param prefetchedGVL - Optional prefetched GVL from SSR
 *   - `undefined` means not prefetched (will fetch)
 *   - `null` means non-IAB region (204 response, skip initialization)
 *   - `GlobalVendorList` means prefetched data to use
 */
export async function initializeIABMode(
	iab: IABConfig,
	{ set, get }: StoreAccess,
	prefetchedGVL?: GlobalVendorList | null
): Promise<void> {
	// If GVL is null, it means we're in a non-IAB region (204 response)
	// Skip IAB initialization entirely
	if (prefetchedGVL === null) {
		return;
	}

	// Mark GVL as loading
	set({
		isLoadingGVL: true,
		nonIABVendors: iab.customVendors ?? [],
	});

	try {
		// Dynamically import IAB modules (lazy loading)
		const { initializeIABStub, fetchGVL, createCMPApi } = await import(
			'../tcf'
		);

		// Initialize IAB stub immediately to start queuing __tcfapi calls
		initializeIABStub();

		// Use prefetched GVL if available, otherwise fetch
		let gvl: GlobalVendorList | null;
		if (prefetchedGVL) {
			gvl = prefetchedGVL;
		} else {
			// Extract vendor IDs from the configuration
			const vendorIds = Object.keys(iab.vendors).map(Number);

			// Fetch GVL from consent.io (filtered by configured vendors)
			gvl = await fetchGVL(vendorIds);

			// If GVL is null (non-IAB region), skip initialization
			if (gvl === null) {
				set({ isLoadingGVL: false });
				return;
			}
		}

		// Update store with GVL
		set({ gvl, isLoadingGVL: false });

		// Initialize CMP API
		const cmpApi = createCMPApi({
			cmpId: iab.cmpId,
			cmpVersion: iab.cmpVersion ?? 1,
			gvl,
			gdprApplies: true,
		});

		set({ cmpApi });

		// Load existing TC String from storage if available
		const existingTcString = cmpApi.loadFromStorage();

		if (existingTcString) {
			await restoreConsentFromTCString(existingTcString, { set, get });
		}
		// No existing consent - initialize default IAB state
		// Purpose 1 (Storage) is required, so we might auto-consent it
		// based on your compliance requirements

		// Update scripts based on IAB consent state
		get().updateScripts();
	} catch (error) {
		console.error('Failed to initialize IAB mode:', error);
		set({ isLoadingGVL: false });
	}
}

/**
 * Restores consent state from an existing TC String.
 *
 * @param tcString - The TC String to decode
 * @param storeAccess - Store getters and setters
 */
async function restoreConsentFromTCString(
	tcString: string,
	{ set }: StoreAccess
): Promise<void> {
	try {
		const { decodeTCString, iabPurposesToC15tConsents } = await import(
			'../tcf'
		);
		const decoded = await decodeTCString(tcString);

		// Map IAB consents to c15t consents
		const c15tConsents = iabPurposesToC15tConsents(decoded.purposeConsents);

		// Update store with tcString and all decoded fields in one go
		set({
			tcString,
			purposeConsents: decoded.purposeConsents,
			purposeLegitimateInterests: decoded.purposeLegitimateInterests,
			vendorConsents: decoded.vendorConsents,
			vendorLegitimateInterests: decoded.vendorLegitimateInterests,
			specialFeatureOptIns: decoded.specialFeatureOptIns,
			consents: c15tConsents,
			selectedConsents: c15tConsents,
			showPopup: false, // User already has consent
		});
	} catch {
		// Invalid TC String, ignore
	}
}
