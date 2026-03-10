/**
 * Tests for TCF Store functions.
 *
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentManagerInterface } from '../../../client/client-interface';
import type { ConsentStoreState } from '../../../store/type';
import type { GlobalVendorList } from '../../../types';
import type { NonIABVendor } from '../../../types/non-iab-vendor';
import {
	createIABActions,
	createIABManager,
	createInitialIABState,
} from '../store';
import type { IABConfig, IABState } from '../types';

// Sample GVL for testing
const sampleGVL: GlobalVendorList = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 142,
	tcfPolicyVersion: 5,
	lastUpdated: '2024-01-15T16:00:00Z',
	purposes: {
		1: {
			id: 1,
			name: 'Store and/or access information',
			description: 'Test purpose 1',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Use limited data to select advertising',
			description: 'Test purpose 2',
			illustrations: [],
		},
		3: {
			id: 3,
			name: 'Create profiles for personalised advertising',
			description: 'Test purpose 3',
			illustrations: [],
		},
	},
	specialPurposes: {
		1: {
			id: 1,
			name: 'Security',
			description: 'Test special purpose',
			illustrations: [],
		},
	},
	features: {
		1: {
			id: 1,
			name: 'Match and combine data',
			description: 'Test feature',
			illustrations: [],
		},
	},
	specialFeatures: {
		1: {
			id: 1,
			name: 'Use precise geolocation',
			description: 'Test special feature',
			illustrations: [],
		},
		2: {
			id: 2,
			name: 'Actively scan device characteristics',
			description: 'Test special feature 2',
			illustrations: [],
		},
	},
	vendors: {
		1: {
			id: 1,
			name: 'Test Vendor 1',
			purposes: [1, 2],
			legIntPurposes: [3],
			specialPurposes: [],
			features: [],
			specialFeatures: [],
			flexiblePurposes: [],
			cookieMaxAgeSeconds: 31536000,
			usesCookies: true,
			cookieRefresh: true,
			usesNonCookieAccess: false,
			urls: [],
		},
		2: {
			id: 2,
			name: 'Test Vendor 2',
			purposes: [1],
			legIntPurposes: [],
			specialPurposes: [],
			features: [],
			specialFeatures: [],
			flexiblePurposes: [],
			cookieMaxAgeSeconds: 0,
			usesCookies: false,
			cookieRefresh: false,
			usesNonCookieAccess: true,
			urls: [],
		},
		3: {
			id: 3,
			name: 'Test Vendor 3 (LI only)',
			purposes: [],
			legIntPurposes: [1, 2],
			specialPurposes: [],
			features: [],
			specialFeatures: [],
			flexiblePurposes: [],
			cookieMaxAgeSeconds: 0,
			usesCookies: false,
			cookieRefresh: false,
			usesNonCookieAccess: false,
			urls: [],
		},
	},
	stacks: {},
	dataCategories: {},
};

const sampleCustomVendors: NonIABVendor[] = [
	{
		id: 'custom-vendor-1',
		name: 'Custom Vendor 1',
		purposes: [1, 2],
		legIntPurposes: [],
		policyUrl: 'https://example.com/privacy',
	},
	{
		id: 'custom-vendor-2',
		name: 'Custom Vendor 2',
		purposes: [],
		legIntPurposes: [1],
		policyUrl: 'https://example.com/privacy',
	},
];

const defaultIABConfig: IABConfig = {
	enabled: true,
	cmpId: 160,
	cmpVersion: 1,
	publisherCountryCode: 'GB',
	isServiceSpecific: true,
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
				enabled: true,
				cmpId: 999,
				cmpVersion: 2,
				publisherCountryCode: 'US',
				isServiceSpecific: false,
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
				iab: {
					...createInitialIABState(defaultIABConfig),
					gvl: sampleGVL,
					nonIABVendors: sampleCustomVendors,
				} as IABState,
				consents: { necessary: true },
				selectedConsents: { necessary: true },
				activeUI: 'none',
				isReady: true,
			} as ConsentStoreState;

			getState = () => mockState;
			setState = (partial) => {
				mockState = { ...mockState, ...partial };
			};

			mockManager = {
				init: vi.fn().mockResolvedValue({ ok: true, data: {} }),
				setConsent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
				identifyUser: vi.fn().mockResolvedValue({ ok: true, data: {} }),
				$fetch: vi.fn().mockResolvedValue({ ok: true, data: {} }),
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
				mockState.iab!.gvl = null;
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
				mockState.iab!.gvl = null;
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
	});

	describe('createIABManager', () => {
		it('should create a complete IAB manager with state and actions', () => {
			const getState = vi.fn().mockReturnValue({ iab: null });
			const setState = vi.fn();
			const mockManager: ConsentManagerInterface = {
				init: vi.fn().mockResolvedValue({ ok: true, data: {} }),
				setConsent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
				identifyUser: vi.fn().mockResolvedValue({ ok: true, data: {} }),
				$fetch: vi.fn().mockResolvedValue({ ok: true, data: {} }),
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
