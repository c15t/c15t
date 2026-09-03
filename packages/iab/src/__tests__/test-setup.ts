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

import type { NonIABVendor } from '@c15t/core';
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
} from '../tcf/iab-tcf-types';

// ─────────────────────────────────────────────────────────────────────────────
// Purpose Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock IAB purpose.
 */
export const createMockPurpose = function createMockPurpose(
	id: number,
	overrides?: Partial<GVLPurpose>
): GVLPurpose {
	const purposeNames: Record<number, string> = {
		1: 'Store and/or access information on a device',
		10: 'Develop and improve services',
		11: 'Use limited data to select content',
		2: 'Use limited data to select advertising',
		3: 'Create profiles for personalised advertising',
		4: 'Use profiles to select personalised advertising',
		5: 'Create profiles to personalise content',
		6: 'Use profiles to select personalised content',
		7: 'Measure advertising performance',
		8: 'Measure content performance',
		9: 'Understand audiences through statistics or combinations of data',
	};

	return {
		description: `Description for purpose ${id}`,
		id,
		illustrations: [`Illustration 1 for purpose ${id}`],
		name: purposeNames[id] ?? `Purpose ${id}`,
		...overrides,
	};
};

export const createMockPurposes = function createMockPurposes(): Record<
	number,
	GVLPurpose
> {
	const purposes: Record<number, GVLPurpose> = {};
	for (let i = 1; i <= 11; i += 1) {
		purposes[i] = createMockPurpose(i);
	}
	return purposes;
};

// ─────────────────────────────────────────────────────────────────────────────
// Special Purpose Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createMockSpecialPurposes =
	function createMockSpecialPurposes(): Record<number, GVLPurpose> {
		return {
			1: {
				description: 'Description for special purpose 1',
				id: 1,
				illustrations: ['Illustration for special purpose 1'],
				name: 'Ensure security, prevent and detect fraud, and fix errors',
			},
			2: {
				description: 'Description for special purpose 2',
				id: 2,
				illustrations: ['Illustration for special purpose 2'],
				name: 'Deliver and present advertising and content',
			},
		};
	};

// ─────────────────────────────────────────────────────────────────────────────
// Feature Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createMockFeatures = function createMockFeatures(): Record<
	number,
	GVLFeature
> {
	return {
		1: {
			description: 'Description for feature 1',
			id: 1,
			illustrations: ['Illustration for feature 1'],
			name: 'Match and combine data from other data sources',
		},
		2: {
			description: 'Description for feature 2',
			id: 2,
			illustrations: ['Illustration for feature 2'],
			name: 'Link different devices',
		},
		3: {
			description: 'Description for feature 3',
			id: 3,
			illustrations: ['Illustration for feature 3'],
			name: 'Identify devices based on information transmitted automatically',
		},
	};
};

/**
 * Creates mock special features.
 */
export const createMockSpecialFeatures =
	function createMockSpecialFeatures(): Record<number, GVLSpecialFeature> {
		return {
			1: {
				description: 'Description for special feature 1',
				id: 1,
				illustrations: ['Illustration for special feature 1'],
				name: 'Use precise geolocation data',
			},
			2: {
				description: 'Description for special feature 2',
				id: 2,
				illustrations: ['Illustration for special feature 2'],
				name: 'Actively scan device characteristics for identification',
			},
		};
	};

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock IAB vendor.
 */
export const createMockVendor = function createMockVendor(
	id: number,
	overrides?: Partial<GVLVendor>
): GVLVendor {
	return {
		cookieMaxAgeSeconds: 31536000,
		cookieRefresh: true,
		features: [1, 2],
		flexiblePurposes: [2, 7],
		id,
		legIntPurposes: [9, 10],
		name: `Test Vendor ${id}`,
		purposes: [1, 2, 7],
		specialFeatures: [],
		specialPurposes: [1, 2],
		urls: [
			{ langId: 'en', privacy: `https://vendor${id}.example.com/privacy` },
		],
		usesCookies: true,
		usesNonCookieAccess: false,
		...overrides,
	};
};

export const createMockVendors = function createMockVendors(
	vendorIds: number[] = [1, 2, 10, 755]
): Record<number, GVLVendor> {
	const vendors: Record<number, GVLVendor> = {};
	for (const id of vendorIds) {
		vendors[id] = createMockVendor(id);
	}
	return vendors;
};

// ─────────────────────────────────────────────────────────────────────────────
// Stack Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates mock stacks.
 */
export const createMockStacks = function createMockStacks(): Record<
	number,
	GVLStack
> {
	return {
		1: {
			description: 'Advertising selection, delivery, and reporting',
			id: 1,
			name: 'Advertising',
			purposes: [2, 3, 4],
			specialFeatures: [],
		},
		2: {
			description: 'Content selection and personalization',
			id: 2,
			name: 'Content Personalization',
			purposes: [5, 6, 11],
			specialFeatures: [],
		},
		3: {
			description: 'Performance measurement and analytics',
			id: 3,
			name: 'Measurement',
			purposes: [7, 8, 9],
			specialFeatures: [],
		},
		4: {
			description: 'Product and service development',
			id: 4,
			name: 'Product Development',
			purposes: [10],
			specialFeatures: [],
		},
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// GVL Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createMockGVL = function createMockGVL(
	overrides?: Partial<GlobalVendorList>
): GlobalVendorList {
	return {
		features: createMockFeatures(),
		gvlSpecificationVersion: 3,
		lastUpdated: '2024-01-15T16:00:23Z',
		purposes: createMockPurposes(),
		specialFeatures: createMockSpecialFeatures(),
		specialPurposes: createMockSpecialPurposes(),
		stacks: createMockStacks(),
		tcfPolicyVersion: 5,
		vendorListVersion: 142,
		vendors: createMockVendors(),
		...overrides,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Consent State Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createMockTCFConsent = function createMockTCFConsent(
	overrides?: Partial<TCFConsentData>
): TCFConsentData {
	return {
		purposeConsents: {
			1: true,
			10: false,
			11: false,
			2: false,
			3: false,
			4: false,
			5: false,
			6: false,
			7: false,
			8: false,
			9: false,
		},
		purposeLegitimateInterests: {
			10: true,
			9: true,
		},
		specialFeatureOptIns: {
			1: false,
			2: false,
		},
		vendorConsents: {
			1: true,
			2: true,
		},
		vendorLegitimateInterests: {
			1: true,
		},
		vendorsDisclosed: {
			1: true,
			2: true,
		},
		...overrides,
	};
};

/**
 * Creates a mock TCF consent data object with all consents granted.
 */
export const createMockTCFConsentAllGranted =
	function createMockTCFConsentAllGranted(): TCFConsentData {
		const purposeConsents: Record<number, boolean> = {};
		const purposeLegitimateInterests: Record<number, boolean> = {};

		for (let i = 1; i <= 11; i += 1) {
			purposeConsents[i] = true;
			purposeLegitimateInterests[i] = true;
		}

		return {
			purposeConsents,
			purposeLegitimateInterests,
			specialFeatureOptIns: { 1: true, 2: true },
			vendorConsents: { 1: true, 10: true, 2: true, 755: true },
			vendorLegitimateInterests: { 1: true, 10: true, 2: true, 755: true },
			vendorsDisclosed: { 1: true, 10: true, 2: true, 755: true },
		};
	};

// ─────────────────────────────────────────────────────────────────────────────
// Non-IAB Vendor Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

export const createMockNonIABVendor = function createMockNonIABVendor(
	id: string,
	overrides?: Partial<NonIABVendor>
): NonIABVendor {
	return {
		cookieMaxAgeSeconds: 31536000,
		dataCategories: [1, 2, 6, 8],
		dataRetentionDays: 365,
		description: `Description for custom vendor ${id}`,
		features: [3],
		id,
		legIntPurposes: [7],
		name: `Custom Vendor ${id}`,
		privacyPolicyUrl: `https://${id}.example.com/privacy`,
		purposes: [1, 8, 10],
		usesCookies: true,
		...overrides,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Window Mock for __tcfapi
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets up a mock __tcfapi on window for testing.
 */
type TcfApiListener = (...args: unknown[]) => void;

export const setupTCFApiMock = function setupTCFApiMock(): {
	mockTcfApi: ReturnType<typeof vi.fn>;
	getListeners: () => Map<number, TcfApiListener>;
	cleanup: () => void;
} {
	if (typeof window === 'undefined') {
		return {
			cleanup: () => {},
			getListeners: () => new Map(),
			mockTcfApi: vi.fn(),
		};
	}

	const listeners = new Map<number, TcfApiListener>();
	let listenerIdCounter = 0;

	const mockTcfApi = vi.fn((command, version, handler, parameter) => {
		switch (command) {
			case 'ping':
				return handler(
					{
						apiVersion: '2.2',
						cmpId: 0,
						cmpLoaded: false,
						cmpStatus: 'stub',
						cmpVersion: 0,
						displayStatus: 'hidden',
						gdprApplies: true,
						gvlVersion: 0,
						// TCF 2.3
						tcfPolicyVersion: 5,
					},
					true
				);
			case 'addEventListener': {
				listenerIdCounter += 1;
				const listenerId = listenerIdCounter;
				listeners.set(listenerId, handler);
				return handler({ listenerId }, true);
			}
			case 'removeEventListener': {
				const existed = listeners.has(parameter as number);
				listeners.delete(parameter as number);
				return handler(existed, true);
			}
			default:
				return handler(null, false);
		}
	}) as unknown as TCFApi;

	(mockTcfApi as TCFApi).queue = [];

	const originalTcfApi = (window as { __tcfapi?: TCFApi }).__tcfapi;

	Object.defineProperty(window, '__tcfapi', {
		configurable: true,
		value: mockTcfApi,
		writable: true,
	});

	return {
		cleanup: () => {
			if (originalTcfApi) {
				(window as { __tcfapi?: TCFApi }).__tcfapi = originalTcfApi;
			} else {
				delete (window as { __tcfapi?: TCFApi }).__tcfapi;
			}
		},
		getListeners: () => listeners,
		mockTcfApi,
	};
};

/**
 * Cleans up __tcfapi from window.
 */
export const cleanupTCFApi = function cleanupTCFApi(): void {
	if (typeof window !== 'undefined') {
		delete (window as { __tcfapi?: TCFApi }).__tcfapi;
	}
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Mock Helper
// ─────────────────────────────────────────────────────────────────────────────

export const createMockFetchResponse = function createMockFetchResponse(
	gvl: GlobalVendorList
): Response {
	return new Response(JSON.stringify(gvl), {
		headers: { 'Content-Type': 'application/json' },
		status: 200,
	});
};

export const setupFetchMock = function setupFetchMock(
	gvl: GlobalVendorList = createMockGVL()
): {
	mockFetch: ReturnType<typeof vi.fn>;
	cleanup: () => void;
} {
	const mockFetch = vi.fn(() => Promise.resolve(createMockFetchResponse(gvl)));

	const originalFetch = globalThis.fetch;
	globalThis.fetch = mockFetch as typeof fetch;

	return {
		cleanup: () => {
			globalThis.fetch = originalFetch;
		},
		mockFetch,
	};
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage Mock Helper
// ─────────────────────────────────────────────────────────────────────────────

export const setupStorageMock = function setupStorageMock(
	initialData?: Record<string, string>
): {
	storage: Map<string, string>;
	cleanup: () => void;
} {
	const storage = new Map<string, string>(
		initialData ? Object.entries(initialData) : []
	);

	if (typeof window === 'undefined') {
		return {
			cleanup: () => {
				storage.clear();
			},
			storage,
		};
	}

	const mockLocalStorage = {
		clear: vi.fn(() => {
			storage.clear();
		}),
		getItem: vi.fn((key: string) => storage.get(key) ?? null),
		key: vi.fn((index: number) => {
			const keys = Array.from(storage.keys());
			return keys[index] ?? null;
		}),
		get length() {
			return storage.size;
		},
		removeItem: vi.fn((key: string) => {
			storage.delete(key);
		}),
		setItem: vi.fn((key: string, value: string) => {
			storage.set(key, value);
		}),
	};

	Object.defineProperty(window, 'localStorage', {
		configurable: true,
		value: mockLocalStorage,
		writable: true,
	});

	return {
		cleanup: () => {
			storage.clear();
		},
		storage,
	};
};

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

export const createMockPublisherRestriction =
	function createMockPublisherRestriction(
		overrides?: Partial<PublisherRestriction>
	): PublisherRestriction {
		return {
			purposeId: 2,
			restrictionType: RestrictionType.NOT_ALLOWED,
			vendorIds: [1, 2],
			...overrides,
		};
	};

/**
 * Creates multiple publisher restrictions for testing.
 */
export const createMockPublisherRestrictions =
	function createMockPublisherRestrictions(): PublisherRestriction[] {
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
	};

// ─────────────────────────────────────────────────────────────────────────────
// Legitimate Interest State Mock Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock legitimate interest state with optional objections.
 *
 * @param objections - Object mapping vendorIds or purposeIds to objection state
 * @returns LI state object
 */
export const createMockLegitimateInterestState =
	function createMockLegitimateInterestState(objections?: {
		vendorObjections?: Record<number, boolean>;
		purposeObjections?: Record<number, boolean>;
	}): {
		vendorLegitimateInterests: Record<number, boolean>;
		purposeLegitimateInterests: Record<number, boolean>;
	} {
		// Default: all LI allowed (true)
		const vendorLegitimateInterests: Record<number, boolean> = {
			1: true,
			10: true,
			2: true,
			755: true,
		};

		const purposeLegitimateInterests: Record<number, boolean> = {
			10: true,
			11: true,
			2: true,
			3: true,
			4: true,
			5: true,
			6: true,
			7: true,
			8: true,
			9: true,
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
			purposeLegitimateInterests,
			vendorLegitimateInterests,
		};
	};

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
export const createMockConsentEvent = function createMockConsentEvent(
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
		cmpStatus: overrides?.cmpStatus ?? 'loaded',
		eventStatus: status,
		gdprApplies: true,
		isServiceSpecific: true,
		listenerId: overrides?.listenerId ?? 0,
		publisher: {
			consents: {},
			customPurpose: { consents: {}, legitimateInterests: {} },
			legitimateInterests: {},
			restrictions: {},
		},
		publisherCC: 'GB',
		purpose: {
			consents: {},
			legitimateInterests: {},
		},
		purposeOneTreatment: false,
		specialFeatureOptins: {},
		tcString: overrides?.tcString ?? '',
		useNonStandardTexts: false,
		vendor: {
			consents: {},
			legitimateInterests: {},
		},
	};
};

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
export const simulateUserObjection = function simulateUserObjection(
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
};

export const createMockGVLWithLIVendors =
	function createMockGVLWithLIVendors(): GlobalVendorList {
		return createMockGVL({
			vendors: {
				1: createMockVendor(1, {
					flexiblePurposes: [2],
					legIntPurposes: [7, 8, 9],
					purposes: [1, 2],
				}),
				10: createMockVendor(10, {
					flexiblePurposes: [],
					legIntPurposes: [2, 7, 9, 10],
					purposes: [1],
				}),
				2: createMockVendor(2, {
					flexiblePurposes: [],
					legIntPurposes: [9, 10],
					purposes: [1, 2, 3],
				}),
				755: createMockVendor(755, {
					flexiblePurposes: [2, 7, 9, 10, 11],
					legIntPurposes: [],
					purposes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
				}),
			},
		});
	};

// ─────────────────────────────────────────────────────────────────────────────
// TC String Assertion Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const assertTCStringHasLIObjection =
	function assertTCStringHasLIObjection(
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
	};

/**
 * Asserts that a TC String contains consent for a specific purpose.
 */
export const assertTCStringHasConsent = function assertTCStringHasConsent(
	decoded: { purposeConsents: Record<number, boolean> },
	purposeId: number
): void {
	const hasConsent = decoded.purposeConsents[purposeId] === true;
	if (!hasConsent) {
		throw new Error(
			`Expected purpose ${purposeId} to have consent, but it does not`
		);
	}
};
