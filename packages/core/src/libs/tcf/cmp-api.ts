/**
 * CMP API Implementation (__tcfapi)
 *
 * Implements the IAB TCF __tcfapi global function using functional programming.
 *
 * @packageDocumentation
 */

import type {
	CMPStatus,
	DisplayStatus,
	EventStatus,
	GlobalVendorList,
	PingData,
	TCData,
	TCFApiCallback,
} from '../../types/iab-tcf';
import { clearStubQueue, getStubQueue } from './stub';
import { decodeTCString } from './tc-string';
import type { CMPApi, CMPApiConfig } from './types';
import { IAB_STORAGE_KEYS } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Storage Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets a cookie value.
 */
function setCookie(name: string, value: string, maxAgeDays: number): void {
	if (typeof document === 'undefined') {
		return;
	}

	const maxAge = maxAgeDays * 24 * 60 * 60;
	document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/**
 * Gets a cookie value.
 */
function getCookie(name: string): string | null {
	if (typeof document === 'undefined') {
		return null;
	}

	const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
	if (match) {
		return decodeURIComponent(match[2]);
	}
	return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CMP API Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a CMP API instance using functional composition.
 *
 * This installs __tcfapi on window and returns control functions.
 * Uses closures for state management (no classes).
 *
 * @param config - Configuration for the CMP API
 * @returns CMP API control interface
 *
 * @example
 * ```typescript
 * const cmpApi = createCMPApi({
 *   cmpId: 28,
 *   cmpVersion: 1,
 *   gvl: gvlData,
 * });
 *
 * // Update consent when user saves
 * cmpApi.updateConsent(tcString);
 *
 * // Show/hide UI
 * cmpApi.setDisplayStatus('visible');
 *
 * // Clean up
 * cmpApi.destroy();
 * ```
 *
 * @public
 */
export function createCMPApi(config: CMPApiConfig): CMPApi {
	const { cmpId, cmpVersion = 1, gvl, gdprApplies = true } = config;

	// ─────────────────────────────────────────────────────────────────────────
	// Internal State (Closure)
	// ─────────────────────────────────────────────────────────────────────────

	let tcString = '';
	let cmpStatus: CMPStatus = 'loading';
	let displayStatus: DisplayStatus = 'hidden';
	const eventListeners = new Map<number, TCFApiCallback<TCData>>();
	let nextListenerId = 0;

	// Decoded TC data cache
	let cachedTCData: TCData | null = null;

	// ─────────────────────────────────────────────────────────────────────────
	// TC Data Construction
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Builds TC Data from current state.
	 */
	async function buildTCData(
		eventStatus?: EventStatus,
		listenerId?: number
	): Promise<TCData> {
		// Use cached data if available and tc string hasn't changed
		if (cachedTCData && cachedTCData.tcString === tcString && !eventStatus) {
			return cachedTCData;
		}

		let purposeConsents: Record<number, boolean> = {};
		let purposeLegitInterests: Record<number, boolean> = {};
		let vendorConsents: Record<number, boolean> = {};
		let vendorLegitInterests: Record<number, boolean> = {};
		let specialFeatureOptins: Record<number, boolean> = {};

		// Decode TC string if present
		if (tcString) {
			try {
				const decoded = await decodeTCString(tcString);
				purposeConsents = decoded.purposeConsents;
				purposeLegitInterests = decoded.purposeLegitimateInterests;
				vendorConsents = decoded.vendorConsents;
				vendorLegitInterests = decoded.vendorLegitimateInterests;
				specialFeatureOptins = decoded.specialFeatureOptIns;
			} catch {
				// Invalid TC string, use empty values
			}
		}

		const tcData: TCData = {
			tcString,
			gdprApplies,
			listenerId,
			eventStatus,
			cmpStatus,
			isServiceSpecific: true,
			useNonStandardTexts: false,
			publisherCC: 'US',
			purposeOneTreatment: false,
			purpose: {
				consents: purposeConsents,
				legitimateInterests: purposeLegitInterests,
			},
			vendor: {
				consents: vendorConsents,
				legitimateInterests: vendorLegitInterests,
			},
			specialFeatureOptins,
			publisher: {
				consents: {},
				legitimateInterests: {},
				customPurpose: {
					consents: {},
					legitimateInterests: {},
				},
				restrictions: {},
			},
		};

		// Cache the data
		if (!eventStatus) {
			cachedTCData = tcData;
		}

		return tcData;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Command Handlers
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Handles the 'ping' command.
	 */
	function handlePing(callback: TCFApiCallback<PingData>): void {
		const pingData: PingData = {
			gdprApplies,
			cmpLoaded: cmpStatus === 'loaded',
			cmpStatus,
			displayStatus,
			apiVersion: '2.2',
			cmpVersion,
			cmpId,
			gvlVersion: gvl.vendorListVersion,
			tcfPolicyVersion: gvl.tcfPolicyVersion,
		};

		callback(pingData, true);
	}

	/**
	 * Handles the 'getTCData' command.
	 */
	async function handleGetTCData(
		callback: TCFApiCallback<TCData>,
		_vendorIds?: number[]
	): Promise<void> {
		const tcData = await buildTCData();
		callback(tcData, true);
	}

	/**
	 * Handles the 'getInAppTCData' command (alias for getTCData).
	 */
	async function handleGetInAppTCData(
		callback: TCFApiCallback<TCData>
	): Promise<void> {
		return handleGetTCData(callback);
	}

	/**
	 * Handles the 'getVendorList' command.
	 */
	function handleGetVendorList(
		callback: TCFApiCallback<GlobalVendorList>,
		_vendorListVersion?: number
	): void {
		callback(gvl, true);
	}

	/**
	 * Handles the 'addEventListener' command.
	 */
	async function handleAddEventListener(
		callback: TCFApiCallback<TCData>
	): Promise<void> {
		const listenerId = nextListenerId++;
		eventListeners.set(listenerId, callback);

		// Immediately call with current state
		const tcData = await buildTCData('tcloaded', listenerId);
		callback(tcData, true);
	}

	/**
	 * Handles the 'removeEventListener' command.
	 */
	function handleRemoveEventListener(
		callback: TCFApiCallback<boolean>,
		listenerId: number
	): void {
		const existed = eventListeners.has(listenerId);
		eventListeners.delete(listenerId);
		callback(existed, true);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Event Notifications
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Notifies all event listeners of a state change.
	 */
	async function notifyEventListeners(eventStatus: EventStatus): Promise<void> {
		for (const [listenerId, callback] of eventListeners) {
			const tcData = await buildTCData(eventStatus, listenerId);
			callback(tcData, true);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Install __tcfapi
	// ─────────────────────────────────────────────────────────────────────────

	function initializeAPI(): void {
		if (typeof window === 'undefined') {
			return;
		}

		// Get queued calls from stub before replacing
		const queuedCalls = getStubQueue();

		// Install the real __tcfapi
		window.__tcfapi = ((
			command: string,
			version: number,
			callback: TCFApiCallback<unknown>,
			parameter?: unknown
		) => {
			switch (command) {
				case 'ping':
					handlePing(callback as TCFApiCallback<PingData>);
					break;
				case 'getTCData':
					handleGetTCData(
						callback as TCFApiCallback<TCData>,
						parameter as number[] | undefined
					);
					break;
				case 'getInAppTCData':
					handleGetInAppTCData(callback as TCFApiCallback<TCData>);
					break;
				case 'getVendorList':
					handleGetVendorList(
						callback as TCFApiCallback<GlobalVendorList>,
						parameter as number | undefined
					);
					break;
				case 'addEventListener':
					handleAddEventListener(callback as TCFApiCallback<TCData>);
					break;
				case 'removeEventListener':
					handleRemoveEventListener(
						callback as TCFApiCallback<boolean>,
						parameter as number
					);
					break;
				default:
					callback(null, false);
			}
		}) as typeof window.__tcfapi;

		// Clear the stub queue
		clearStubQueue();

		// Process queued calls
		for (const args of queuedCalls) {
			window.__tcfapi(...args);
		}

		// Mark as loaded
		cmpStatus = 'loaded';
	}

	// Initialize on creation
	initializeAPI();

	// ─────────────────────────────────────────────────────────────────────────
	// Public Interface
	// ─────────────────────────────────────────────────────────────────────────

	return {
		updateConsent: (newTcString: string) => {
			tcString = newTcString;
			cachedTCData = null; // Invalidate cache
			cmpStatus = 'loaded';
			notifyEventListeners('useractioncomplete');
		},

		setDisplayStatus: (status: DisplayStatus) => {
			displayStatus = status;
			if (status === 'visible') {
				notifyEventListeners('cmpuishown');
			}
		},

		loadFromStorage: (): string | null => {
			// Try cookie first (per TCF spec)
			const cookieValue = getCookie(IAB_STORAGE_KEYS.TC_STRING_COOKIE);
			if (cookieValue) {
				tcString = cookieValue;
				cachedTCData = null;
				notifyEventListeners('tcloaded');
				return cookieValue;
			}

			// Fallback to localStorage
			if (typeof localStorage !== 'undefined') {
				try {
					const localValue = localStorage.getItem(
						IAB_STORAGE_KEYS.TC_STRING_LOCAL
					);
					if (localValue) {
						tcString = localValue;
						cachedTCData = null;
						notifyEventListeners('tcloaded');
						return localValue;
					}
				} catch {
					// Storage not available
				}
			}

			return null;
		},

		saveToStorage: (newTcString: string) => {
			// Save to cookie (per TCF spec, 13 month expiry)
			setCookie(IAB_STORAGE_KEYS.TC_STRING_COOKIE, newTcString, 395);

			// Also save to localStorage as backup
			if (typeof localStorage !== 'undefined') {
				try {
					localStorage.setItem(IAB_STORAGE_KEYS.TC_STRING_LOCAL, newTcString);
				} catch {
					// Storage full or disabled
				}
			}
		},

		getTcString: () => tcString,

		destroy: () => {
			eventListeners.clear();
			cachedTCData = null;

			if (typeof window !== 'undefined') {
				delete (window as { __tcfapi?: unknown }).__tcfapi;
			}
		},
	};
}
