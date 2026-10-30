/**
 * CMP API Implementation (__tcfapi)
 *
 * Implements the IAB TCF __tcfapi global function using functional programming.
 *
 * @packageDocumentation
 */

import type { CMPApi, CMPApiConfig, GlobalVendorList } from '@c15t/core';

import { copyPlainData } from '../copy-plain-data';
import { forEachSequential } from '../for-each-sequential';
import { CMP_VERSION_NUMBER } from './cmp-defaults';
import { assertValidCmpId } from './cmp-id';
import { IAB_STORAGE_KEYS } from './constants';
import type {
	CMPStatus,
	DisplayStatus,
	EventStatus,
	PingData,
	TCData,
	TCDataOutsideTCF,
	TCFApiCallback,
	TCFConsentData,
} from './iab-tcf-types';
import { toTCDataRestrictions } from './publisher-restrictions';
import { clearStubQueue, getStubQueue } from './stub';
import { decodeTCString, getDisclosedVendorIds } from './tc-string';

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
 * Removes a superseded TC string from the `euconsent-v2` cookie and its
 * localStorage copy, so vendors reading storage directly, and
 * `loadFromStorage()`, no longer find it. Each entry is removed only while
 * it still holds `tcString`: another tab may have saved a newer one.
 *
 * @param tcString - The superseded TC string.
 *
 * @internal
 */
export const clearStoredTCString = function clearStoredTCString(
	tcString: string
): void {
	// Each store is cleared on its own: a malformed cookie must not keep the
	// localStorage copy alive.
	// The AC string goes with the TC string it was saved beside.
	try {
		if (
			typeof document !== 'undefined' &&
			getCookie(IAB_STORAGE_KEYS.TC_STRING_COOKIE) === tcString
		) {
			document.cookie = `${IAB_STORAGE_KEYS.TC_STRING_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
			document.cookie = `${IAB_STORAGE_KEYS.AC_STRING_COOKIE}=; max-age=0; path=/; SameSite=Lax`;
		}
	} catch {
		// The cookie value can be malformed.
	}
	try {
		if (localStorage.getItem(IAB_STORAGE_KEYS.TC_STRING_LOCAL) === tcString) {
			localStorage.removeItem(IAB_STORAGE_KEYS.TC_STRING_LOCAL);
			localStorage.removeItem(IAB_STORAGE_KEYS.AC_STRING_LOCAL);
		}
	} catch {
		// Storage can be unavailable.
	}
};

/**
 * Rewrites the stored AC string beside `tcString` to `addtlConsent`, or
 * removes it when there is none. A list that drops a provider changes the
 * AC string of a TC string already saved, and vendors reading storage must
 * not keep finding the provider in it. Like {@link clearStoredTCString},
 * each store changes only while it still holds `tcString`.
 *
 * @param tcString - The TC string the AC string was saved beside.
 * @param addtlConsent - The AC string it now carries, if any.
 *
 * @internal
 */
export const syncStoredAdditionalConsent = function syncStoredAdditionalConsent(
	tcString: string,
	addtlConsent: string | undefined
): void {
	try {
		if (
			typeof document !== 'undefined' &&
			getCookie(IAB_STORAGE_KEYS.TC_STRING_COOKIE) === tcString &&
			(getCookie(IAB_STORAGE_KEYS.AC_STRING_COOKIE) ?? undefined) !==
				addtlConsent
		) {
			setCookie(
				IAB_STORAGE_KEYS.AC_STRING_COOKIE,
				addtlConsent ?? '',
				addtlConsent ? 395 : 0
			);
		}
	} catch {
		// The cookie value can be malformed.
	}
	try {
		if (
			localStorage.getItem(IAB_STORAGE_KEYS.TC_STRING_LOCAL) === tcString &&
			(localStorage.getItem(IAB_STORAGE_KEYS.AC_STRING_LOCAL) ?? undefined) !==
				addtlConsent
		) {
			if (addtlConsent) {
				localStorage.setItem(IAB_STORAGE_KEYS.AC_STRING_LOCAL, addtlConsent);
			} else {
				localStorage.removeItem(IAB_STORAGE_KEYS.AC_STRING_LOCAL);
			}
		}
	} catch {
		// Storage can be unavailable.
	}
};

/**
 * Copies consent data down to its vectors, so the API's copy is never
 * shared with the caller.
 */
const copyConsentData = function copyConsentData(
	consentData: TCFConsentData
): TCFConsentData {
	return {
		...consentData,
		publisherRestrictions: consentData.publisherRestrictions?.map(
			(restriction) => ({
				...restriction,
				vendorIds: [...restriction.vendorIds],
			})
		),
		purposeConsents: { ...consentData.purposeConsents },
		purposeLegitimateInterests: { ...consentData.purposeLegitimateInterests },
		specialFeatureOptIns: { ...consentData.specialFeatureOptIns },
		vendorConsents: { ...consentData.vendorConsents },
		vendorLegitimateInterests: { ...consentData.vendorLegitimateInterests },
		vendorsDisclosed: { ...consentData.vendorsDisclosed },
	};
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
	// Vendors read these two fields from `__tcfapi` ping, so an unusable CMP ID
	// must fail here rather than be reported as if it were valid.
	const cmpId = assertValidCmpId(config.cmpId);
	const cmpVersion = config.cmpVersion ?? CMP_VERSION_NUMBER;
	let { gvl } = config;
	/**
	 * Whether the visitor's policy uses IAB TCF. `__tcfapi` reports it as
	 * `gdprApplies`, the CMP API's name for it.
	 */
	let tcfApplies = config.gdprApplies ?? true;

	let tcString = '';
	/** The AC string confirmed with `tcString`, if any. */
	let addtlConsent: string | undefined;
	const addtlConsentFor = (string: string): string | undefined =>
		string ? config.getAddtlConsent?.(string) : undefined;
	let cmpStatus: CMPStatus = 'loading';
	let displayStatus: DisplayStatus = 'hidden';
	const eventListeners = new Map<
		number,
		TCFApiCallback<TCData | TCDataOutsideTCF>
	>();
	let nextListenerId = 0;

	// Decoded TC data cache
	let cachedTCData: TCData | null = null;
	/** Counts changes to the published state, so answers can detect them. */
	let stateRevision = 0;
	let currentConsentData: TCFConsentData | null = null;
	const cmpVersionNumber =
		typeof cmpVersion === 'number'
			? cmpVersion
			: Number.parseInt(String(cmpVersion), 10) || 1;
	/**
	 * Builds TC Data for one TC string and the consent data published with it.
	 */
	const composeTCData = async function composeTCData(
		string: string,
		consentData: TCFConsentData | null,
		additional: string | undefined,
		eventStatus?: EventStatus,
		listenerId?: number
	): Promise<TCData> {
		let purposeConsents: Record<number, boolean> =
			consentData?.purposeConsents ?? {};
		let purposeLegitInterests: Record<number, boolean> =
			consentData?.purposeLegitimateInterests ?? {};
		let vendorConsents: Record<number, boolean> = Object.fromEntries(
			Object.entries(consentData?.vendorConsents ?? {}).map(([id, value]) => [
				Number(id),
				value,
			])
		);
		let vendorLegitInterests: Record<number, boolean> = Object.fromEntries(
			Object.entries(consentData?.vendorLegitimateInterests ?? {}).map(
				([id, value]) => [Number(id), value]
			)
		);
		let specialFeatureOptins: Record<number, boolean> =
			consentData?.specialFeatureOptIns ?? {};
		let disclosedVendorIds = getDisclosedVendorIds(
			consentData?.vendorsDisclosed ?? {}
		);
		// Restrictions always come from the string vendors receive.
		let restrictions: Record<number, Record<number, number>> = {};

		// Decode TC string if present
		if (string) {
			try {
				const decoded = await decodeTCString(string);
				restrictions = toTCDataRestrictions(decoded.publisherRestrictions);
				if (!consentData) {
					// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
					purposeConsents = decoded.purposeConsents;
					purposeLegitInterests = decoded.purposeLegitimateInterests;
					// oxlint-disable-next-line prefer-destructuring -- Preserve declaration order, interface shape, and public compatibility.
					vendorConsents = decoded.vendorConsents;
					vendorLegitInterests = decoded.vendorLegitimateInterests;
					specialFeatureOptins = decoded.specialFeatureOptIns;
					disclosedVendorIds = getDisclosedVendorIds(decoded.vendorsDisclosed);
				}
			} catch {
				// Invalid TC string, use empty values
			}
		}

		const tcData: TCData = {
			cmpId,
			cmpStatus,
			cmpVersion: cmpVersionNumber,
			eventStatus,
			gdprApplies: true,
			isServiceSpecific: true,
			listenerId,
			publisher: {
				consents: {},
				customPurpose: {
					consents: {},
					legitimateInterests: {},
				},
				legitimateInterests: {},
				restrictions,
			},
			publisherCC: 'US',
			purpose: {
				consents: purposeConsents,
				legitimateInterests: purposeLegitInterests,
			},
			purposeOneTreatment: false,
			specialFeatureOptins,
			tcString: string,
			tcfPolicyVersion: gvl.tcfPolicyVersion,
			useNonStandardTexts: false,
			vendor: {
				consents: vendorConsents,
				disclosedVendors: Object.fromEntries(
					disclosedVendorIds.map((vendorId) => [vendorId, true])
				),
				legitimateInterests: vendorLegitInterests,
			},
		};
		// Google discards an AC string sent without a TC string.
		if (string && additional) {
			tcData.addtlConsent = additional;
		}

		return tcData;
	};

	/**
	 * Builds TC Data from current state.
	 */
	const buildTCData = async function buildTCData(
		eventStatus?: EventStatus,
		listenerId?: number
	): Promise<TCData | TCDataOutsideTCF> {
		// CMP API v2: when TCF does not apply, only these fields exist. The
		// visitor's policy decides that, not their jurisdiction. Listeners
		// still get their status and ID, which removeEventListener needs.
		if (!tcfApplies) {
			const outside: TCDataOutsideTCF = {
				cmpId,
				cmpStatus,
				cmpVersion: cmpVersionNumber,
				gdprApplies: false,
				tcfPolicyVersion: gvl.tcfPolicyVersion,
			};
			if (eventStatus) {
				outside.eventStatus = eventStatus;
			}
			if (listenerId !== undefined) {
				outside.listenerId = listenerId;
			}
			return outside;
		}
		// Use cached data if available and tc string hasn't changed. Callers
		// get their own copy, down to the nested maps, so changing a result
		// never changes the next one.
		if (
			cachedTCData &&
			cachedTCData.tcString === tcString &&
			cachedTCData.addtlConsent === addtlConsent &&
			!eventStatus
		) {
			return { ...copyPlainData(cachedTCData), listenerId };
		}
		const string = tcString;
		const consentData = currentConsentData;
		const additional = addtlConsent;
		const tcData = await composeTCData(
			string,
			consentData,
			additional,
			eventStatus,
			listenerId
		);
		// An update can land while the string decodes. Never pair its string
		// with the earlier vectors, or publish it once the policy stops using
		// TCF: build again from the newer state.
		if (
			!tcfApplies ||
			tcString !== string ||
			currentConsentData !== consentData ||
			addtlConsent !== additional
		) {
			return buildTCData(eventStatus, listenerId);
		}

		// Cache a private copy of the data
		if (!eventStatus) {
			cachedTCData = copyPlainData(tcData);
		}

		return tcData;
	};

	/**
	 * Sends TC data that is still current when the callback runs. The state
	 * can change while any build is pending, cached or not, so build again
	 * until none landed, then call back in the same task as the check.
	 */
	const sendCurrentTCData = async function sendCurrentTCData(
		handler: TCFApiCallback<TCData | TCDataOutsideTCF>,
		eventStatus: () => EventStatus | undefined,
		listenerId?: number
	): Promise<void> {
		const revision = stateRevision;
		const tcData = await buildTCData(eventStatus(), listenerId);
		if (revision !== stateRevision) {
			return sendCurrentTCData(handler, eventStatus, listenerId);
		}
		handler(tcData, true);
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
			gdprApplies: tcfApplies,
			gvlVersion: gvl.vendorListVersion,
			tcfPolicyVersion: gvl.tcfPolicyVersion,
		};

		handler(pingData, true);
	};

	/**
	 * Handles the 'getTCData' command.
	 */
	const handleGetTCData = async function handleGetTCData(
		handler: TCFApiCallback<TCData | TCDataOutsideTCF>,
		_vendorIds?: number[]
	): Promise<void> {
		await sendCurrentTCData(handler, () => undefined);
	};

	/**
	 * Handles the 'getInAppTCData' command (alias for getTCData).
	 */
	const handleGetInAppTCData = function handleGetInAppTCData(
		handler: TCFApiCallback<TCData | TCDataOutsideTCF>
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
		handler(cmpStatus === 'loaded' ? gvl : null, cmpStatus === 'loaded');
	};

	/**
	 * Whether vendors can act on the published state without the visitor:
	 * a TC string is available, or the visitor's policy does not use TCF.
	 */
	const hasSignal = (): boolean => tcString !== '' || !tcfApplies;

	/**
	 * The status a new listener is told. TCF CMP API v2: `tcloaded` means a
	 * valid TC string is available and no UI will be shown, and the CMP must
	 * not send it when it shows the UI instead. While the UI is up the
	 * status is `cmpuishown`. Without either there is no status yet.
	 */
	const currentStatus = (): EventStatus | undefined => {
		if (cmpStatus !== 'loaded') {
			return undefined;
		}
		if (displayStatus === 'visible') {
			return 'cmpuishown';
		}
		return hasSignal() ? 'tcloaded' : undefined;
	};

	/**
	 * Handles the 'addEventListener' command.
	 */
	const handleAddEventListener = async function handleAddEventListener(
		handler: TCFApiCallback<TCData | TCDataOutsideTCF>
	): Promise<void> {
		nextListenerId += 1;
		const listenerId = nextListenerId;
		eventListeners.set(listenerId, handler);

		// Registration always returns its ID, including while the list is loading.
		await sendCurrentTCData(handler, currentStatus, listenerId);
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
		eventStatus: EventStatus | undefined
	): Promise<void> {
		await forEachSequential(eventListeners, {
			run: ([listenerId, listener]) =>
				sendCurrentTCData(listener, () => eventStatus, listenerId),
		});
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
						handler as TCFApiCallback<TCData | TCDataOutsideTCF>,
						parameter as number[] | undefined
					);
					break;
				case 'getInAppTCData':
					handleGetInAppTCData(
						handler as TCFApiCallback<TCData | TCDataOutsideTCF>
					);
					break;
				case 'getVendorList':
					handleGetVendorList(
						handler as TCFApiCallback<GlobalVendorList>,
						parameter as number | undefined
					);
					break;
				case 'addEventListener':
					handleAddEventListener(
						handler as TCFApiCallback<TCData | TCDataOutsideTCF>
					);
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

		// The real API is created with a list. Replayed calls can read it now.
		cmpStatus = 'loaded';

		// Process queued calls
		for (const args of queuedCalls) {
			window.__tcfapi?.(...args);
		}
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
				addtlConsent = addtlConsentFor(cookieValue);
				cachedTCData = null;
				stateRevision += 1;
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
						addtlConsent = addtlConsentFor(localValue);
						cachedTCData = null;
						stateRevision += 1;
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
			const additional = addtlConsentFor(newTcString);
			// Save to cookie (per TCF spec, 13 month expiry)
			setCookie(IAB_STORAGE_KEYS.TC_STRING_COOKIE, newTcString, 395);
			// The AC string is stored beside its TC string, or removed so an
			// older one is never read with the new TC string.
			if (additional) {
				setCookie(IAB_STORAGE_KEYS.AC_STRING_COOKIE, additional, 395);
			} else {
				setCookie(IAB_STORAGE_KEYS.AC_STRING_COOKIE, '', 0);
			}

			// Also save to localStorage as backup
			if (typeof localStorage !== 'undefined') {
				try {
					localStorage.setItem(IAB_STORAGE_KEYS.TC_STRING_LOCAL, newTcString);
					if (additional) {
						localStorage.setItem(IAB_STORAGE_KEYS.AC_STRING_LOCAL, additional);
					} else {
						localStorage.removeItem(IAB_STORAGE_KEYS.AC_STRING_LOCAL);
					}
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

		updateConsent: (
			newTcString: string,
			consentData?: TCFConsentData,
			applies?: boolean
		) => {
			const additional = addtlConsentFor(newTcString);
			const changed =
				newTcString !== tcString ||
				additional !== addtlConsent ||
				(applies !== undefined && applies !== tcfApplies);
			tcfApplies = applies ?? tcfApplies;
			tcString = newTcString;
			addtlConsent = additional;
			// Keep a private copy: a caller changing its object in place must
			// not change, or half change, the vectors published for this string.
			currentConsentData =
				newTcString && consentData ? copyConsentData(consentData) : null;
			// Invalidate cache
			cachedTCData = null;
			stateRevision += 1;
			if (cmpStatus !== 'loaded') {
				return;
			}
			if (consentData) {
				notifyEventListeners('useractioncomplete');
				return;
			}
			// Authority can expire or change in another tab while the UI is up.
			// Report those changes too, without calling them tcloaded.
			if (!changed) {
				return;
			}
			// A withdrawn string is no `tcloaded`: listeners still hear that
			// it is gone, with no status.
			notifyEventListeners(hasSignal() ? currentStatus() : undefined);
		},

		updateVendorList: (nextGvl) => {
			if (nextGvl) {
				gvl = nextGvl;
			}
			cmpStatus = nextGvl ? 'loaded' : 'loading';
			tcString = '';
			addtlConsent = undefined;
			currentConsentData = null;
			cachedTCData = null;
			stateRevision += 1;
			// The owner publishes current confirmed TC data with updateConsent.
		},
	};
};
