/**
 * Tests for TCF Store functions.
 *
 * @packageDocumentation
 */

import type {
	ConsentManagerInterface,
	ConsentStoreState,
	GlobalVendorList,
} from '@c15t/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NonIABVendor } from '../../tcf/non-iab-vendor';
import {
	createIABActions,
	createIABManager,
	createInitialIABState,
} from '../../tcf/store';
import type { IABConfig, IABState } from '../../tcf/types';

const getDefined = <Value>(
	value: Value,
	message = 'Expected value to be defined'
): NonNullable<Value> => {
	if (value === null || value === undefined) {
		throw new Error(message);
	}
	return value;
};

// Sample GVL for testing
const sampleGVL: GlobalVendorList = {
	dataCategories: {},
	features: {
		1: {
			description: 'Test feature',
			id: 1,
			illustrations: [],
			name: 'Match and combine data',
		},
	},
	gvlSpecificationVersion: 3,
	lastUpdated: '2024-01-15T16:00:00Z',
	purposes: {
		1: {
			description: 'Test purpose 1',
			id: 1,
			illustrations: [],
			name: 'Store and/or access information',
		},
		2: {
			description: 'Test purpose 2',
			id: 2,
			illustrations: [],
			name: 'Use limited data to select advertising',
		},
		3: {
			description: 'Test purpose 3',
			id: 3,
			illustrations: [],
			name: 'Create profiles for personalised advertising',
		},
	},
	specialFeatures: {
		1: {
			description: 'Test special feature',
			id: 1,
			illustrations: [],
			name: 'Use precise geolocation',
		},
		2: {
			description: 'Test special feature 2',
			id: 2,
			illustrations: [],
			name: 'Actively scan device characteristics',
		},
	},
	specialPurposes: {
		1: {
			description: 'Test special purpose',
			id: 1,
			illustrations: [],
			name: 'Security',
		},
	},
	stacks: {},
	tcfPolicyVersion: 5,
	vendorListVersion: 142,
	vendors: {
		1: {
			cookieMaxAgeSeconds: 31536000,
			cookieRefresh: true,
			features: [],
			flexiblePurposes: [],
			id: 1,
			legIntPurposes: [3],
			name: 'Test Vendor 1',
			purposes: [1, 2],
			specialFeatures: [],
			specialPurposes: [],
			urls: [],
			usesCookies: true,
			usesNonCookieAccess: false,
		},
		2: {
			cookieMaxAgeSeconds: 0,
			cookieRefresh: false,
			features: [],
			flexiblePurposes: [],
			id: 2,
			legIntPurposes: [],
			name: 'Test Vendor 2',
			purposes: [1],
			specialFeatures: [],
			specialPurposes: [],
			urls: [],
			usesCookies: false,
			usesNonCookieAccess: true,
		},
		3: {
			cookieMaxAgeSeconds: 0,
			cookieRefresh: false,
			features: [],
			flexiblePurposes: [],
			id: 3,
			legIntPurposes: [1, 2],
			name: 'Test Vendor 3 (LI only)',
			purposes: [],
			specialFeatures: [],
			specialPurposes: [],
			urls: [],
			usesCookies: false,
			usesNonCookieAccess: false,
		},
	},
};

const sampleCustomVendors: NonIABVendor[] = [
	{
		id: 'custom-vendor-1',
		legIntPurposes: [],
		name: 'Custom Vendor 1',
		policyUrl: 'https://example.com/privacy',
		purposes: [1, 2],
	},
	{
		id: 'custom-vendor-2',
		legIntPurposes: [1],
		name: 'Custom Vendor 2',
		policyUrl: 'https://example.com/privacy',
		purposes: [],
	},
];

const defaultIABConfig: IABConfig = {
	cmpId: 160,
	cmpVersion: 1,
	enabled: true,
	isServiceSpecific: true,
	publisherCountryCode: 'GB',
};

describe('TCF Store', () => {
	describe('createInitialIABState', () => {
		it('should create initial state with default values', () => {
			const state = createInitialIABState(defaultIABConfig);

			expect(state.config).toBe(defaultIABConfig);
			expect(state.gvl).toBeNull();
			expect(state.isLoadingGVL).toBe(false);
			expect(state.nonIABVendors).toEqual([]);
			expect(state.tcString).toBeNull();
			expect(state.vendorConsents).toEqual({});
			expect(state.vendorLegitimateInterests).toEqual({});
			expect(state.purposeConsents).toEqual({});
			expect(state.purposeLegitimateInterests).toEqual({});
			expect(state.specialFeatureOptIns).toEqual({});
			expect(state.vendorsDisclosed).toEqual({});
			expect(state.cmpApi).toBeNull();
			expect(state.preferenceCenterTab).toBe('purposes');
		});

		it('should preserve config in state', () => {
			const customConfig: IABConfig = {
				cmpId: 999,
				cmpVersion: 2,
				enabled: true,
				isServiceSpecific: false,
				publisherCountryCode: 'US',
			};

			const state = createInitialIABState(customConfig);

			expect(state.config).toEqual(customConfig);
		});
	});

	describe('createIABActions', () => {
		let mockState: ConsentStoreState;
		let getState: () => ConsentStoreState;
		let setState: (partial: Partial<ConsentStoreState>) => void;
		let mockManager: ConsentManagerInterface;

		beforeEach(() => {
			mockState = {
				activeUI: 'none',
				consents: { necessary: true },
				iab: {
					...createInitialIABState(defaultIABConfig),
					gvl: sampleGVL,
					nonIABVendors: sampleCustomVendors,
				} as IABState,
				isReady: true,
				selectedConsents: { necessary: true },
			} as ConsentStoreState;

			getState = () => mockState;
			setState = (partial) => {
				mockState = { ...mockState, ...partial };
			};

			mockManager = {
				$fetch: vi.fn().mockResolvedValue({ data: {}, ok: true }),
				identifyUser: vi.fn().mockResolvedValue({ data: {}, ok: true }),
				init: vi.fn().mockResolvedValue({ data: {}, ok: true }),
				setConsent: vi.fn().mockResolvedValue({ data: {}, ok: true }),
			};
		});

		describe('setPurposeConsent', () => {
			it('should set purpose consent', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setPurposeConsent(1, true);

				expect(mockState.iab?.purposeConsents[1]).toBe(true);
			});

			it('should update existing purpose consent', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setPurposeConsent(1, true);
				actions.setPurposeConsent(1, false);

				expect(mockState.iab?.purposeConsents[1]).toBe(false);
			});

			it('should not fail when iab is null', () => {
				mockState.iab = undefined as unknown as IABState;
				const actions = createIABActions(getState, setState, mockManager);

				expect(() => actions.setPurposeConsent(1, true)).not.toThrow();
			});
		});

		describe('setPurposeLegitimateInterest', () => {
			it('should set purpose legitimate interest', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setPurposeLegitimateInterest(2, false);

				expect(mockState.iab?.purposeLegitimateInterests[2]).toBe(false);
			});
		});

		describe('setVendorConsent', () => {
			it('should set vendor consent with numeric ID', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setVendorConsent(1, true);

				expect(mockState.iab?.vendorConsents['1']).toBe(true);
			});

			it('should set vendor consent with string ID', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setVendorConsent('custom-vendor-1', true);

				expect(mockState.iab?.vendorConsents['custom-vendor-1']).toBe(true);
			});
		});

		describe('setVendorLegitimateInterest', () => {
			it('should set vendor legitimate interest', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setVendorLegitimateInterest(1, false);

				expect(mockState.iab?.vendorLegitimateInterests['1']).toBe(false);
			});
		});

		describe('setSpecialFeatureOptIn', () => {
			it('should set special feature opt-in', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setSpecialFeatureOptIn(1, true);

				expect(mockState.iab?.specialFeatureOptIns[1]).toBe(true);
			});
		});

		describe('setPreferenceCenterTab', () => {
			it('should set preference center tab', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.setPreferenceCenterTab('vendors');

				expect(mockState.iab?.preferenceCenterTab).toBe('vendors');
			});
		});

		describe('acceptAll', () => {
			it('should set all purposes, vendors, and special features to true', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions.acceptAll();

				// Check purpose consents
				expect(mockState.iab?.purposeConsents[1]).toBe(true);
				expect(mockState.iab?.purposeConsents[2]).toBe(true);
				expect(mockState.iab?.purposeConsents[3]).toBe(true);

				// Check purpose LI
				expect(mockState.iab?.purposeLegitimateInterests[1]).toBe(true);
				expect(mockState.iab?.purposeLegitimateInterests[2]).toBe(true);
				expect(mockState.iab?.purposeLegitimateInterests[3]).toBe(true);

				// Check vendor consents (only vendors with purposes)
				expect(mockState.iab?.vendorConsents['1']).toBe(true);
				expect(mockState.iab?.vendorConsents['2']).toBe(true);
				// Vendor 3 has no consent-based purposes, so it shouldn't be in vendorConsents
				expect(mockState.iab?.vendorConsents['3']).toBeUndefined();

				// Check vendor LI (only vendors with legIntPurposes)
				expect(mockState.iab?.vendorLegitimateInterests['1']).toBe(true);
				expect(mockState.iab?.vendorLegitimateInterests['3']).toBe(true);
				// Vendor 2 has no LI purposes
				expect(mockState.iab?.vendorLegitimateInterests['2']).toBeUndefined();

				// Check custom vendors
				expect(mockState.iab?.vendorConsents['custom-vendor-1']).toBe(true);
				expect(
					mockState.iab?.vendorLegitimateInterests['custom-vendor-2']
				).toBe(true);

				// Check special features
				expect(mockState.iab?.specialFeatureOptIns[1]).toBe(true);
				expect(mockState.iab?.specialFeatureOptIns[2]).toBe(true);
			});

			it('should not fail when GVL is null', () => {
				getDefined(mockState.iab).gvl = null;
				const actions = createIABActions(getState, setState, mockManager);

				expect(() => actions.acceptAll()).not.toThrow();
			});
		});

		describe('rejectAll', () => {
			it('should reject all purposes except Purpose 1 and set vendors/features to false', () => {
				const actions = createIABActions(getState, setState, mockManager);

				// First accept all
				actions.acceptAll();

				// Then reject all
				actions.rejectAll();

				// Purpose 1 should remain true
				expect(mockState.iab?.purposeConsents[1]).toBe(true);
				// Other purposes should be false
				expect(mockState.iab?.purposeConsents[2]).toBe(false);
				expect(mockState.iab?.purposeConsents[3]).toBe(false);

				// All vendor consents should be false
				expect(mockState.iab?.vendorConsents['1']).toBe(false);
				expect(mockState.iab?.vendorConsents['2']).toBe(false);

				// All special features should be false
				expect(mockState.iab?.specialFeatureOptIns[1]).toBe(false);
				expect(mockState.iab?.specialFeatureOptIns[2]).toBe(false);
			});

			it('should not fail when GVL is null', () => {
				getDefined(mockState.iab).gvl = null;
				const actions = createIABActions(getState, setState, mockManager);

				expect(() => actions.rejectAll()).not.toThrow();
			});
		});

		describe('_updateState', () => {
			it('should update nested IAB state', () => {
				const actions = createIABActions(getState, setState, mockManager);

				actions._updateState({ isLoadingGVL: true });

				expect(mockState.iab?.isLoadingGVL).toBe(true);
			});
		});

		describe('save', () => {
			it.todo(
				'applies restrictive policy purpose allowlist before persisting and API send'
			);

			it.todo(
				'does not filter c15t consents when policy allowlist is wildcard'
			);
		});
	});

	describe('createIABManager', () => {
		it('should create a complete IAB manager with state and actions', () => {
			const getState = vi.fn().mockReturnValue({ iab: null });
			const setState = vi.fn();
			const mockManager: ConsentManagerInterface = {
				$fetch: vi.fn().mockResolvedValue({ data: {}, ok: true }),
				identifyUser: vi.fn().mockResolvedValue({ data: {}, ok: true }),
				init: vi.fn().mockResolvedValue({ data: {}, ok: true }),
				setConsent: vi.fn().mockResolvedValue({ data: {}, ok: true }),
			};

			const manager = createIABManager(
				defaultIABConfig,
				getState,
				setState,
				mockManager
			);

			// Check state properties
			expect(manager.config).toBe(defaultIABConfig);
			expect(manager.gvl).toBeNull();
			expect(manager.isLoadingGVL).toBe(false);

			// Check action methods exist
			expect(typeof manager.setPurposeConsent).toBe('function');
			expect(typeof manager.setVendorConsent).toBe('function');
			expect(typeof manager.acceptAll).toBe('function');
			expect(typeof manager.rejectAll).toBe('function');
			expect(typeof manager.save).toBe('function');
		});
	});
});
