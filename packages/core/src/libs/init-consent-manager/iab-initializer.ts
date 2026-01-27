/**
 * IAB TCF mode initialization.
 *
 * @packageDocumentation
 */

import { CMP_ID, CMP_VERSION } from '../../cmp-defaults';
import type { GlobalVendorList } from '../../types/iab-tcf';
import type { IABConfig, IABState } from '../tcf/types';
import type { StoreAccess } from './types';

/**
 * Helper to update nested IAB state.
 */
function updateIABState(
	{ get, set }: StoreAccess,
	updates: Partial<IABState>
): void {
	const { iab } = get();
	if (!iab) {
		return;
	}
	set({
		iab: { ...iab, ...updates },
	});
}

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
	storeAccess: StoreAccess,
	prefetchedGVL?: GlobalVendorList | null
): Promise<void> {
	const { get } = storeAccess;

	// If GVL is null, it means we're in a non-IAB region (204 response)
	// Skip IAB initialization entirely
	if (prefetchedGVL === null) {
		return;
	}

	// Mark GVL as loading and set non-IAB vendors
	updateIABState(storeAccess, {
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
			// Fetch GVL from consent.io (no client-side filtering - GVL is source of truth)
			// Backend may still filter vendorIds if configured
			gvl = await fetchGVL();

			// If GVL is null (non-IAB region), skip initialization
			if (gvl === null) {
				updateIABState(storeAccess, { isLoadingGVL: false });
				return;
			}
		}

		// Update store with GVL
		updateIABState(storeAccess, { gvl, isLoadingGVL: false });

		// Initialize vendor consents based on their declared legal bases
		// - Only set consent for vendors with consent-based purposes
		// - Only set LI for vendors with LI-based purposes
		// - Consent defaults to false (GDPR requires opt-in)
		// - LI defaults to true (allowed) - user can object to opt-out
		const initialVendorConsents: Record<number, boolean> = {};
		const initialVendorLegitimateInterests: Record<number, boolean> = {};

		// Initialize GVL vendors based on their declared legal bases
		for (const [vendorId, vendor] of Object.entries(gvl.vendors)) {
			const id = Number(vendorId);
			// Only track consent for vendors that have consent-based purposes
			if (vendor.purposes && vendor.purposes.length > 0) {
				initialVendorConsents[id] = false;
			}
			// Only track LI for vendors that have LI-based purposes
			if (vendor.legIntPurposes && vendor.legIntPurposes.length > 0) {
				// LI defaults to true (allowed) - user can object to opt-out
				initialVendorLegitimateInterests[id] = true;
			}
		}

		// Initialize custom vendors (IDs start from 90000 to match UI component)
		const customVendors = iab.customVendors ?? [];
		customVendors.forEach((cv, index) => {
			const customVendorId = 90000 + index;
			// Only track consent for custom vendors with purposes
			if (cv.purposes && cv.purposes.length > 0) {
				initialVendorConsents[customVendorId] = false;
			}
			// Only track LI for custom vendors with legIntPurposes
			if (cv.legIntPurposes && cv.legIntPurposes.length > 0) {
				initialVendorLegitimateInterests[customVendorId] = true;
			}
		});

		updateIABState(storeAccess, {
			vendorConsents: initialVendorConsents,
			vendorLegitimateInterests: initialVendorLegitimateInterests,
		});

		const effectiveCmpId = iab.cmpId ?? CMP_ID;
		const effectiveCmpVersion = iab.cmpVersion ?? CMP_VERSION;

		// Warn about CMP registration in development
		if (
			process.env.NODE_ENV === 'development' ||
			process.env.NODE_ENV === 'test'
		) {
			// Common placeholder/test CMP IDs that indicate the CMP is not registered
			const PLACEHOLDER_CMP_IDS = [0, 1, 28, 123, 999];
			if (PLACEHOLDER_CMP_IDS.includes(effectiveCmpId)) {
				console.warn(
					`[c15t] IAB TCF Warning: Using CMP ID ${effectiveCmpId} which appears to be a placeholder.\n` +
						'For production IAB TCF 2.3 compliance, you must register your CMP with IAB Europe.\n' +
						'Registration: https://iabeurope.eu/tcf-for-cmps/\n' +
						'CMP List: https://iabeurope.eu/cmp-list/'
				);
			}
		}

		// Initialize CMP API
		const cmpApi = createCMPApi({
			cmpId: effectiveCmpId,
			cmpVersion: effectiveCmpVersion,
			gvl,
			gdprApplies: true,
		});

		updateIABState(storeAccess, { cmpApi });

		// Load existing TC String from storage if available
		const existingTcString = cmpApi.loadFromStorage();

		if (existingTcString) {
			await restoreConsentFromTCString(existingTcString, storeAccess);
		}
		// No existing consent - initialize default IAB state
		// Purpose 1 (Storage) is required, so we might auto-consent it
		// based on your compliance requirements

		// Update scripts based on IAB consent state
		get().updateScripts();
	} catch (error) {
		console.error('Failed to initialize IAB mode:', error);
		updateIABState(storeAccess, { isLoadingGVL: false });
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
	storeAccess: StoreAccess
): Promise<void> {
	const { set } = storeAccess;

	try {
		const { decodeTCString, iabPurposesToC15tConsents } = await import(
			'../tcf'
		);
		const decoded = await decodeTCString(tcString);

		// Map IAB consents to c15t consents
		const c15tConsents = iabPurposesToC15tConsents(decoded.purposeConsents);

		// Update IAB state with decoded TC String data
		updateIABState(storeAccess, {
			tcString,
			purposeConsents: decoded.purposeConsents,
			purposeLegitimateInterests: decoded.purposeLegitimateInterests,
			vendorConsents: decoded.vendorConsents,
			vendorLegitimateInterests: decoded.vendorLegitimateInterests,
			specialFeatureOptIns: decoded.specialFeatureOptIns,
		});

		// Update core consent state
		set({
			consents: c15tConsents,
			selectedConsents: c15tConsents,
			showPopup: false, // User already has consent
		});
	} catch {
		// Invalid TC String, ignore
	}
}
