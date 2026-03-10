/**
 * Test setup and utilities for IAB TCF tests.
 *
 * This file provides:
 * - Mock factories for GVL, vendors, purposes, and consent data
 * - Window mock setup for __tcfapi
 * - Common test fixtures
 *
 * @packageDocumentation
 */

import { vi } from 'vitest';
import type {
	GlobalVendorList,
	GVLFeature,
	GVLPurpose,
	GVLSpecialFeature,
	GVLStack,
	GVLVendor,
	TCFApi,
	TCFConsentData,
} from '../../../types/iab-tcf';
import type { NonIABVendor } from '../../../types/non-iab-vendor';

// ─────────────────────────────────────────────────────────────────────────────
// Purpose Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock IAB purpose.
 */
export function createMockPurpose(
	id: number,
	overrides?: Partial<GVLPurpose>
): GVLPurpose {
	const purposeNames: Record<number, string> = {
		1: 'Store and/or access information on a device',
		2: 'Use limited data to select advertising',
		3: 'Create profiles for personalised advertising',
		4: 'Use profiles to select personalised advertising',
		5: 'Create profiles to personalise content',
		6: 'Use profiles to select personalised content',
		7: 'Measure advertising performance',
		8: 'Measure content performance',
		9: 'Understand audiences through statistics or combinations of data',
		10: 'Develop and improve services',
		11: 'Use limited data to select content',
	};

	return {
		id,
		name: purposeNames[id] ?? `Purpose ${id}`,
		description: `Description for purpose ${id}`,
		illustrations: [`Illustration 1 for purpose ${id}`],
		...overrides,
	};
}

/**
 * Creates all 11 IAB purposes.
 */
export function createMockPurposes(): Record<number, GVLPurpose> {
	const purposes: Record<number, GVLPurpose> = {};
	for (let i = 1; i <= 11; i++) {
		purposes[i] = createMockPurpose(i);
	}
	return purposes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Special Purpose Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates mock special purposes.
 */
export function createMockSpecialPurposes(): Record<number, GVLPurpose> {
	return {
		1: {
			id: 1,
			name: 'Ensure security, prevent and detect fraud, and fix errors',
			description: 'Description for special purpose 1',
			illustrations: ['Illustration for special purpose 1'],
		},
		2: {
			id: 2,
			name: 'Deliver and present advertising and content',
			description: 'Description for special purpose 2',
			illustrations: ['Illustration for special purpose 2'],
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates mock IAB features.
 */
export function createMockFeatures(): Record<number, GVLFeature> {
	return {
		1: {
			id: 1,
			name: 'Match and combine data from other data sources',
			description: 'Description for feature 1',
			illustrations: ['Illustration for feature 1'],
		},
		2: {
			id: 2,
			name: 'Link different devices',
			description: 'Description for feature 2',
			illustrations: ['Illustration for feature 2'],
		},
		3: {
			id: 3,
			name: 'Identify devices based on information transmitted automatically',
			description: 'Description for feature 3',
			illustrations: ['Illustration for feature 3'],
		},
	};
}

/**
 * Creates mock special features.
 */
export function createMockSpecialFeatures(): Record<number, GVLSpecialFeature> {
	return {
		1: {
			id: 1,
			name: 'Use precise geolocation data',
			description: 'Description for special feature 1',
			illustrations: ['Illustration for special feature 1'],
		},
		2: {
			id: 2,
			name: 'Actively scan device characteristics for identification',
			description: 'Description for special feature 2',
			illustrations: ['Illustration for special feature 2'],
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock IAB vendor.
 */
export function createMockVendor(
	id: number,
	overrides?: Partial<GVLVendor>
): GVLVendor {
	return {
		id,
		name: `Test Vendor ${id}`,
		purposes: [1, 2, 7],
		legIntPurposes: [9, 10],
		flexiblePurposes: [2, 7],
		specialPurposes: [1, 2],
		features: [1, 2],
		specialFeatures: [],
		cookieMaxAgeSeconds: 31536000,
		usesCookies: true,
		cookieRefresh: true,
		usesNonCookieAccess: false,
		urls: [
			{ langId: 'en', privacy: `https://vendor${id}.example.com/privacy` },
		],
		...overrides,
	};
}

/**
 * Creates multiple mock vendors.
 */
export function createMockVendors(
	vendorIds: number[] = [1, 2, 10, 755]
): Record<number, GVLVendor> {
	const vendors: Record<number, GVLVendor> = {};
	for (const id of vendorIds) {
		vendors[id] = createMockVendor(id);
	}
	return vendors;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stack Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates mock stacks.
 */
export function createMockStacks(): Record<number, GVLStack> {
	return {
		1: {
			id: 1,
			name: 'Advertising',
			description: 'Advertising selection, delivery, and reporting',
			purposes: [2, 3, 4],
			specialFeatures: [],
		},
		2: {
			id: 2,
			name: 'Content Personalization',
			description: 'Content selection and personalization',
			purposes: [5, 6, 11],
			specialFeatures: [],
		},
		3: {
			id: 3,
			name: 'Measurement',
			description: 'Performance measurement and analytics',
			purposes: [7, 8, 9],
			specialFeatures: [],
		},
		4: {
			id: 4,
			name: 'Product Development',
			description: 'Product and service development',
			purposes: [10],
			specialFeatures: [],
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// GVL Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a complete mock Global Vendor List.
 */
export function createMockGVL(
	overrides?: Partial<GlobalVendorList>
): GlobalVendorList {
	return {
		gvlSpecificationVersion: 3,
		vendorListVersion: 142,
		tcfPolicyVersion: 5,
		lastUpdated: '2024-01-15T16:00:23Z',
		purposes: createMockPurposes(),
		specialPurposes: createMockSpecialPurposes(),
		features: createMockFeatures(),
		specialFeatures: createMockSpecialFeatures(),
		vendors: createMockVendors(),
		stacks: createMockStacks(),
		...overrides,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent State Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock TCF consent data object.
 */
export function createMockTCFConsent(
	overrides?: Partial<TCFConsentData>
): TCFConsentData {
	return {
		purposeConsents: {
			1: true,
			2: false,
			3: false,
			4: false,
			5: false,
			6: false,
			7: false,
			8: false,
			9: false,
			10: false,
			11: false,
		},
		purposeLegitimateInterests: {
			9: true,
			10: true,
		},
		vendorConsents: {
			1: true,
			2: true,
		},
		vendorLegitimateInterests: {
			1: true,
		},
		specialFeatureOptIns: {
			1: false,
			2: false,
		},
		vendorsDisclosed: {
			1: true,
			2: true,
		},
		...overrides,
	};
}

/**
 * Creates a mock TCF consent data object with all consents granted.
 */
export function createMockTCFConsentAllGranted(): TCFConsentData {
	const purposeConsents: Record<number, boolean> = {};
	const purposeLegitimateInterests: Record<number, boolean> = {};

	for (let i = 1; i <= 11; i++) {
		purposeConsents[i] = true;
		purposeLegitimateInterests[i] = true;
	}

	return {
		purposeConsents,
		purposeLegitimateInterests,
		vendorConsents: { 1: true, 2: true, 10: true, 755: true },
		vendorLegitimateInterests: { 1: true, 2: true, 10: true, 755: true },
		specialFeatureOptIns: { 1: true, 2: true },
		vendorsDisclosed: { 1: true, 2: true, 10: true, 755: true },
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Non-IAB Vendor Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock non-IAB vendor.
 */
export function createMockNonIABVendor(
	id: string,
	overrides?: Partial<NonIABVendor>
): NonIABVendor {
	return {
		id,
		name: `Custom Vendor ${id}`,
		privacyPolicyUrl: `https://${id}.example.com/privacy`,
		description: `Description for custom vendor ${id}`,
		purposes: [1, 8, 10],
		legIntPurposes: [7],
		features: [3],
		dataCategories: [1, 2, 6, 8],
		usesCookies: true,
		cookieMaxAgeSeconds: 31536000,
		dataRetentionDays: 365,
		...overrides,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Window Mock for __tcfapi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets up a mock __tcfapi on window for testing.
 */
export function setupTCFApiMock(): {
	mockTcfApi: ReturnType<typeof vi.fn>;
	getListeners: () => Map<number, Function>;
	cleanup: () => void;
} {
	if (typeof window === 'undefined') {
		return {
			mockTcfApi: vi.fn(),
			getListeners: () => new Map(),
			cleanup: () => {},
		};
	}

	const listeners = new Map<number, Function>();
	let listenerIdCounter = 0;

	const mockTcfApi = vi.fn((command, version, callback, parameter) => {
		switch (command) {
			case 'ping':
				callback(
					{
						gdprApplies: true,
						cmpLoaded: false,
						cmpStatus: 'stub',
						displayStatus: 'hidden',
						apiVersion: '2.2',
						cmpVersion: 0,
						cmpId: 0,
						gvlVersion: 0,
						tcfPolicyVersion: 5, // TCF 2.3
					},
					true
				);
				break;
			case 'addEventListener': {
				const listenerId = listenerIdCounter++;
				listeners.set(listenerId, callback);
				callback({ listenerId }, true);
				break;
			}
			case 'removeEventListener': {
				const existed = listeners.has(parameter as number);
				listeners.delete(parameter as number);
				callback(existed, true);
				break;
			}
			default:
				callback(null, false);
		}
	}) as unknown as TCFApi;

	(mockTcfApi as TCFApi).queue = [];

	const originalTcfApi = (window as { __tcfapi?: TCFApi }).__tcfapi;

	Object.defineProperty(window, '__tcfapi', {
		value: mockTcfApi,
		writable: true,
		configurable: true,
	});

	return {
		mockTcfApi,
		getListeners: () => listeners,
		cleanup: () => {
			if (originalTcfApi) {
				(window as { __tcfapi?: TCFApi }).__tcfapi = originalTcfApi;
			} else {
				delete (window as { __tcfapi?: TCFApi }).__tcfapi;
			}
		},
	};
}

/**
 * Cleans up __tcfapi from window.
 */
export function cleanupTCFApi(): void {
	if (typeof window !== 'undefined') {
		delete (window as { __tcfapi?: TCFApi }).__tcfapi;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Mock Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock fetch response for GVL.
 */
export function createMockFetchResponse(gvl: GlobalVendorList): Response {
	return new Response(JSON.stringify(gvl), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

/**
 * Sets up fetch mock for GVL requests.
 */
export function setupFetchMock(gvl: GlobalVendorList = createMockGVL()): {
	mockFetch: ReturnType<typeof vi.fn>;
	cleanup: () => void;
} {
	const mockFetch = vi.fn(() => Promise.resolve(createMockFetchResponse(gvl)));

	const originalFetch = globalThis.fetch;
	globalThis.fetch = mockFetch as typeof fetch;

	return {
		mockFetch,
		cleanup: () => {
			globalThis.fetch = originalFetch;
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Mock Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets up localStorage mock with initial data.
 */
export function setupStorageMock(initialData?: Record<string, string>): {
	storage: Map<string, string>;
	cleanup: () => void;
} {
	const storage = new Map<string, string>(
		initialData ? Object.entries(initialData) : []
	);

	if (typeof window === 'undefined') {
		return {
			storage,
			cleanup: () => {
				storage.clear();
			},
		};
	}

	const mockLocalStorage = {
		getItem: vi.fn((key: string) => storage.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
		}),
		clear: vi.fn(() => {
			storage.clear();
		}),
		get length() {
			return storage.size;
		},
		key: vi.fn((index: number) => {
			const keys = Array.from(storage.keys());
			return keys[index] ?? null;
		}),
	};

	Object.defineProperty(window, 'localStorage', {
		value: mockLocalStorage,
		writable: true,
		configurable: true,
	});

	return {
		storage,
		cleanup: () => {
			storage.clear();
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Publisher Restrictions Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Restriction types per IAB TCF spec.
 */
export enum RestrictionType {
	/** Purpose is not allowed for this vendor */
	NOT_ALLOWED = 0,
	/** Vendor must use consent (cannot use LI) */
	REQUIRE_CONSENT = 1,
	/** Vendor must use LI (cannot use consent) */
	REQUIRE_LEGITIMATE_INTEREST = 2,
}

/**
 * Publisher restriction entry.
 */
export interface PublisherRestriction {
	purposeId: number;
	restrictionType: RestrictionType;
	vendorIds: number[];
}

/**
 * Creates a mock publisher restriction.
 */
export function createMockPublisherRestriction(
	overrides?: Partial<PublisherRestriction>
): PublisherRestriction {
	return {
		purposeId: 2,
		restrictionType: RestrictionType.NOT_ALLOWED,
		vendorIds: [1, 2],
		...overrides,
	};
}

/**
 * Creates multiple publisher restrictions for testing.
 */
export function createMockPublisherRestrictions(): PublisherRestriction[] {
	return [
		// Type 0: Purpose 2 not allowed for vendors 1, 2
		{
			purposeId: 2,
			restrictionType: RestrictionType.NOT_ALLOWED,
			vendorIds: [1, 2],
		},
		// Type 1: Purpose 7 requires consent for vendor 10
		{
			purposeId: 7,
			restrictionType: RestrictionType.REQUIRE_CONSENT,
			vendorIds: [10],
		},
		// Type 2: Purpose 9 requires LI for vendor 755
		{
			purposeId: 9,
			restrictionType: RestrictionType.REQUIRE_LEGITIMATE_INTEREST,
			vendorIds: [755],
		},
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// Legitimate Interest State Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock legitimate interest state with optional objections.
 *
 * @param objections - Object mapping vendorIds or purposeIds to objection state
 * @returns LI state object
 */
export function createMockLegitimateInterestState(objections?: {
	vendorObjections?: Record<number, boolean>;
	purposeObjections?: Record<number, boolean>;
}): {
	vendorLegitimateInterests: Record<number, boolean>;
	purposeLegitimateInterests: Record<number, boolean>;
} {
	// Default: all LI allowed (true)
	const vendorLegitimateInterests: Record<number, boolean> = {
		1: true,
		2: true,
		10: true,
		755: true,
	};

	const purposeLegitimateInterests: Record<number, boolean> = {
		2: true,
		3: true,
		4: true,
		5: true,
		6: true,
		7: true,
		8: true,
		9: true,
		10: true,
		11: true,
	};

	// Apply objections (set to false)
	if (objections?.vendorObjections) {
		for (const [vendorId, objected] of Object.entries(
			objections.vendorObjections
		)) {
			if (objected) {
				vendorLegitimateInterests[Number(vendorId)] = false;
			}
		}
	}

	if (objections?.purposeObjections) {
		for (const [purposeId, objected] of Object.entries(
			objections.purposeObjections
		)) {
			if (objected) {
				purposeLegitimateInterests[Number(purposeId)] = false;
			}
		}
	}

	return {
		vendorLegitimateInterests,
		purposeLegitimateInterests,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent Event Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Event status values per IAB TCF spec.
 */
export type EventStatus = 'tcloaded' | 'cmpuishown' | 'useractioncomplete';

/**
 * Creates a mock consent event.
 */
export function createMockConsentEvent(
	status: EventStatus,
	overrides?: Partial<{
		tcString: string;
		listenerId: number;
		cmpStatus: 'stub' | 'loading' | 'loaded' | 'error';
	}>
): {
	eventStatus: EventStatus;
	tcString: string;
	listenerId: number;
	cmpStatus: string;
	gdprApplies: boolean;
	isServiceSpecific: boolean;
	useNonStandardTexts: boolean;
	publisherCC: string;
	purposeOneTreatment: boolean;
	purpose: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
	};
	vendor: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
	};
	specialFeatureOptins: Record<number, boolean>;
	publisher: {
		consents: Record<number, boolean>;
		legitimateInterests: Record<number, boolean>;
		customPurpose: {
			consents: Record<number, boolean>;
			legitimateInterests: Record<number, boolean>;
		};
		restrictions: Record<number, Record<number, number>>;
	};
} {
	return {
		eventStatus: status,
		tcString: overrides?.tcString ?? '',
		listenerId: overrides?.listenerId ?? 0,
		cmpStatus: overrides?.cmpStatus ?? 'loaded',
		gdprApplies: true,
		isServiceSpecific: true,
		useNonStandardTexts: false,
		publisherCC: 'GB',
		purposeOneTreatment: false,
		purpose: {
			consents: {},
			legitimateInterests: {},
		},
		vendor: {
			consents: {},
			legitimateInterests: {},
		},
		specialFeatureOptins: {},
		publisher: {
			consents: {},
			legitimateInterests: {},
			customPurpose: { consents: {}, legitimateInterests: {} },
			restrictions: {},
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// LI Objection Simulation Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Simulates a user objecting to LI for a vendor and/or purpose.
 *
 * @param state - Current consent state
 * @param vendorId - Vendor to object to
 * @param purposeId - Optional purpose to object to (cascades to all vendors if set)
 * @returns Updated state with objection applied
 */
export function simulateUserObjection(
	state: TCFConsentData,
	vendorId: number,
	purposeId?: number
): TCFConsentData {
	const updated = { ...state };

	// Always set vendor LI to false (objection)
	updated.vendorLegitimateInterests = {
		...state.vendorLegitimateInterests,
		[vendorId]: false,
	};

	// If purpose is specified, also object at purpose level
	if (purposeId !== undefined) {
		updated.purposeLegitimateInterests = {
			...state.purposeLegitimateInterests,
			[purposeId]: false,
		};
	}

	return updated;
}

/**
 * Creates a GVL with vendors that have legitimate interest purposes.
 */
export function createMockGVLWithLIVendors(): GlobalVendorList {
	return createMockGVL({
		vendors: {
			1: createMockVendor(1, {
				purposes: [1, 2],
				legIntPurposes: [7, 8, 9],
				flexiblePurposes: [2],
			}),
			2: createMockVendor(2, {
				purposes: [1, 2, 3],
				legIntPurposes: [9, 10],
				flexiblePurposes: [],
			}),
			10: createMockVendor(10, {
				purposes: [1],
				legIntPurposes: [2, 7, 9, 10],
				flexiblePurposes: [],
			}),
			755: createMockVendor(755, {
				purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
				legIntPurposes: [],
				flexiblePurposes: [2, 7, 9, 10, 11],
			}),
		},
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// TC String Assertion Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asserts that a TC String contains an LI objection for a specific vendor.
 * This is a helper for use with decodeTCString.
 */
export function assertTCStringHasLIObjection(
	decoded: { vendorLegitimateInterests: Record<number, boolean> },
	vendorId: number
): void {
	// LI objection means the vendor is NOT in the LI consent list
	const hasLI = decoded.vendorLegitimateInterests[vendorId] === true;
	if (hasLI) {
		throw new Error(
			`Expected vendor ${vendorId} to have LI objection, but LI is still granted`
		);
	}
}

/**
 * Asserts that a TC String contains consent for a specific purpose.
 */
export function assertTCStringHasConsent(
	decoded: { purposeConsents: Record<number, boolean> },
	purposeId: number
): void {
	const hasConsent = decoded.purposeConsents[purposeId] === true;
	if (!hasConsent) {
		throw new Error(
			`Expected purpose ${purposeId} to have consent, but it does not`
		);
	}
}
