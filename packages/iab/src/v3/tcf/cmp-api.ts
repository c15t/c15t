/**
 * CMP API Implementation (__tcfapi)
 *
 * Implements the IAB TCF __tcfapi global function using functional programming.
 *
 * @packageDocumentation
 */

import type { CMPApi, CMPApiConfig, GlobalVendorList } from '@c15t/core';

import { CMP_ID, CMP_VERSION } from './cmp-defaults';
import { IAB_STORAGE_KEYS } from './constants';
import type {
	CMPStatus,
	DisplayStatus,
	EventStatus,
	PingData,
	TCData,
	TCFApiCallback,
	TCFConsentData,
} from './iab-tcf-types';
import { clearStubQueue, getStubQueue } from './stub';
import { decodeTCString } from './tc-string';

/**
 * Sets a cookie value.
 */
const setCookie = function setCookie(
	name: string,
	value: string,
	maxAgeDays: number
): void {
	if (typeof document === 'undefined') {
		return;
	}

	const maxAge = maxAgeDays * 24 * 60 * 60;
	document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
};

/**
 * Gets a cookie value.
 */
const getCookie = function getCookie(name: string): string | null {
	if (typeof document === 'undefined') {
		return null;
	}

	const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`, 'u'));
	if (match?.[2]) {
		return decodeURIComponent(match[2]);
	}
	return null;
};

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
export const createCMPApi = function createCMPApi(
	config: CMPApiConfig
): CMPApi {
	const {
		cmpId = CMP_ID,
		cmpVersion = CMP_VERSION,
		gvl,
		gdprApplies = true,
	} = config;

	let tcString = '';
	let cmpStatus: CMPStatus = 'loading';
	let displayStatus: DisplayStatus = 'hidden';
	const eventListeners = new Map<number, TCFApiCallback<TCData>>();
	let nextListenerId = 0;

	// Decoded TC data cache
	let cachedTCData: TCData | null = null;
	let currentConsentData: TCFConsentData | null = null;
	/**
	 * Builds TC Data from current state.
	 */
	const buildTCData = async function buildTCData(
		eventStatus?: EventStatus,
		listenerId?: number
	): Promise<TCData> {
		// Use cached data if available and tc string hasn't changed
		if (cachedTCData && cachedTCData.tcString === tcString && !eventStatus) {
			return cachedTCData;
		}

		let purposeConsents: Record<number, boolean> =
			currentConsentData?.purposeConsents ?? {};
		let purposeLegitInterests: Record<number, boolean> =
			currentConsentData?.purposeLegitimateInterests ?? {};
		let vendorConsents: Record<number, boolean> = Object.fromEntries(
			Object.entries(currentConsentData?.vendorConsents ?? {}).map(
				([id, value]) => [Number(id), value]
			)
		);
		let vendorLegitInterests: Record<number, boolean> = Object.fromEntries(
			Object.entries(currentConsentData?.vendorLegitimateInterests ?? {}).map(
				([id, value]) => [Number(id), value]
			)
		);
		let specialFeatureOptins: Record<number, boolean> =
			currentConsentData?.specialFeatureOptIns ?? {};

		// Decode TC string if present
		if (tcString && !currentConsentData) {
			try {
				const decoded = await decodeTCString(tcString);
				// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
				purposeConsents = decoded.purposeConsents;
				purposeLegitInterests = decoded.purposeLegitimateInterests;
				// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
				vendorConsents = decoded.vendorConsents;
				vendorLegitInterests = decoded.vendorLegitimateInterests;
				specialFeatureOptins = decoded.specialFeatureOptIns;
			} catch {
				// Invalid TC string, use empty values
			}
		}

		const cmpVersionNum =
			typeof cmpVersion === 'number'
				? cmpVersion
				: Number.parseInt(String(cmpVersion), 10) || 1;
		const tcData: TCData = {
			cmpId,
			cmpStatus,
			cmpVersion: cmpVersionNum,
			eventStatus,
			gdprApplies,
			isServiceSpecific: true,
			listenerId,
			publisher: {
				consents: {},
				customPurpose: {
					consents: {},
					legitimateInterests: {},
				},
				legitimateInterests: {},
				restrictions: {},
			},
			publisherCC: 'US',
			purpose: {
				consents: purposeConsents,
				legitimateInterests: purposeLegitInterests,
			},
			purposeOneTreatment: false,
			specialFeatureOptins,
			tcString,
			tcfPolicyVersion: gvl.tcfPolicyVersion,
			useNonStandardTexts: false,
			vendor: {
				consents: vendorConsents,
				legitimateInterests: vendorLegitInterests,
			},
		};

		// Cache the data
		if (!eventStatus) {
			cachedTCData = tcData;
		}

		return tcData;
	};

	/**
	 * Handles the 'ping' command.
	 */
	const handlePing = function handlePing(
		handler: TCFApiCallback<PingData>
	): void {
		const pingData: PingData = {
			apiVersion: '2.3',
			cmpId,
			cmpLoaded: cmpStatus === 'loaded',
			cmpStatus,
			cmpVersion:
				typeof cmpVersion === 'string' ? cmpVersion : String(cmpVersion),
			displayStatus,
			gdprApplies,
			gvlVersion: gvl.vendorListVersion,
			tcfPolicyVersion: gvl.tcfPolicyVersion,
		};

		handler(pingData, true);
	};

	/**
	 * Handles the 'getTCData' command.
	 */
	const handleGetTCData = async function handleGetTCData(
		handler: TCFApiCallback<TCData>,
		_vendorIds?: number[]
	): Promise<void> {
		const tcData = await buildTCData();
		handler(tcData, true);
	};

	/**
	 * Handles the 'getInAppTCData' command (alias for getTCData).
	 */
	// oxlint-disable-next-line require-await -- Async signature preserves the callback or public contract.
	const handleGetInAppTCData = async function handleGetInAppTCData(
		handler: TCFApiCallback<TCData>
	): Promise<void> {
		return handleGetTCData(handler);
	};

	/**
	 * Handles the 'getVendorList' command.
	 */
	const handleGetVendorList = function handleGetVendorList(
		handler: TCFApiCallback<GlobalVendorList>,
		_vendorListVersion?: number
	): void {
		handler(gvl, true);
	};

	/**
	 * Handles the 'addEventListener' command.
	 */
	const handleAddEventListener = async function handleAddEventListener(
		handler: TCFApiCallback<TCData>
	): Promise<void> {
		nextListenerId += 1;
		const listenerId = nextListenerId;
		eventListeners.set(listenerId, handler);

		// Immediately call with current state
		const tcData = await buildTCData('tcloaded', listenerId);
		handler(tcData, true);
	};

	/**
	 * Handles the 'removeEventListener' command.
	 */
	const handleRemoveEventListener = function handleRemoveEventListener(
		handler: TCFApiCallback<boolean>,
		listenerId: number
	): void {
		const existed = eventListeners.has(listenerId);
		eventListeners.delete(listenerId);
		handler(existed, true);
	};

	/**
	 * Notifies all event listeners of a state change.
	 */
	const notifyEventListeners = async function notifyEventListeners(
		eventStatus: EventStatus
	): Promise<void> {
		for (const [listenerId, listener] of eventListeners) {
			// oxlint-disable-next-line no-await-in-loop -- Operations are intentionally serial to preserve order and limit concurrency.
			const tcData = await buildTCData(eventStatus, listenerId);
			listener(tcData, true);
		}
	};

	const initializeAPI = function initializeAPI(): void {
		if (typeof window === 'undefined') {
			return;
		}

		// Get queued calls from stub before replacing
		const queuedCalls = getStubQueue();

		// Install the real __tcfapi
		window.__tcfapi = ((
			command: string,
			version: number,
			handler: TCFApiCallback<unknown>,
			parameter?: unknown
		) => {
			switch (command) {
				case 'ping':
					handlePing(handler as TCFApiCallback<PingData>);
					break;
				case 'getTCData':
					handleGetTCData(
						handler as TCFApiCallback<TCData>,
						parameter as number[] | undefined
					);
					break;
				case 'getInAppTCData':
					handleGetInAppTCData(handler as TCFApiCallback<TCData>);
					break;
				case 'getVendorList':
					handleGetVendorList(
						handler as TCFApiCallback<GlobalVendorList>,
						parameter as number | undefined
					);
					break;
				case 'addEventListener':
					handleAddEventListener(handler as TCFApiCallback<TCData>);
					break;
				case 'removeEventListener':
					handleRemoveEventListener(
						handler as TCFApiCallback<boolean>,
						parameter as number
					);
					break;
				default:
					return handler(null, false);
			}
		}) as typeof window.__tcfapi;

		// Clear the stub queue
		clearStubQueue();

		// Process queued calls
		for (const args of queuedCalls) {
			window.__tcfapi?.(...args);
		}

		// Mark as loaded
		cmpStatus = 'loaded';
	};

	// Initialize on creation
	initializeAPI();

	return {
		destroy: () => {
			eventListeners.clear();
			cachedTCData = null;

			if (typeof window !== 'undefined') {
				delete (window as { __tcfapi?: unknown }).__tcfapi;
			}
		},

		getTcString: () => tcString,

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

		setDisplayStatus: (status: DisplayStatus) => {
			displayStatus = status;
			if (status === 'visible') {
				notifyEventListeners('cmpuishown');
			}
		},

		updateConsent: (newTcString: string, consentData?: TCFConsentData) => {
			tcString = newTcString;
			currentConsentData = consentData ?? currentConsentData;
			// Invalidate cache
			cachedTCData = null;
			cmpStatus = 'loaded';
			notifyEventListeners('useractioncomplete');
		},
	};
};
