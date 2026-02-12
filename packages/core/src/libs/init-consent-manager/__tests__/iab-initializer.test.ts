/**
 * Tests for IAB TCF mode initialization.
 *
 * @vitest-environment jsdom
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GlobalVendorList } from '../../../types/iab-tcf';
import { initializeIABMode } from '../iab-initializer';
import type { StoreAccess } from '../types';
import { createMockStoreState } from './test-setup';

// Mock the TCF module
const mockLoadFromStorage = vi.fn().mockReturnValue(null);
const mockCmpApi = { loadFromStorage: mockLoadFromStorage };

vi.mock('../../iab-tcf', () => ({
	initializeIABStub: vi.fn(),
	fetchGVL: vi.fn(),
	createCMPApi: vi.fn(() => mockCmpApi),
	decodeTCString: vi.fn(),
	iabPurposesToC15tConsents: vi.fn(),
}));

// Mock cookie module
vi.mock('../../cookie', () => ({
	getConsentFromStorage: vi.fn().mockReturnValue(null),
}));

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
	},
	specialPurposes: {},
	features: {},
	specialFeatures: {
		1: {
			id: 1,
			name: 'Use precise geolocation',
			description: 'Test special feature',
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
			purposes: [],
			legIntPurposes: [1, 2],
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
	},
	stacks: {},
	dataCategories: {},
};

describe('initializeIABMode', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let storeAccess: StoreAccess;
	let mockState: ReturnType<typeof createMockStoreState>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockLoadFromStorage.mockReturnValue(null);

		mockState = createMockStoreState({
			iab: {
				config: {
					enabled: true,
					cmpId: 160,
					cmpVersion: 1,
					publisherCountryCode: 'GB',
					isServiceSpecific: true,
				},
				gvl: null,
				isLoadingGVL: false,
				nonIABVendors: [],
				tcString: null,
				vendorConsents: {},
				vendorLegitimateInterests: {},
				purposeConsents: {},
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				vendorsDisclosed: {},
				cmpApi: null,
				preferenceCenterTab: 'purposes',
			},
		});

		mockGet = vi.fn().mockReturnValue(mockState);
		mockSet = vi.fn((partial) => {
			Object.assign(mockState, partial);
		});

		storeAccess = {
			get: mockGet,
			set: mockSet,
		};
	});

	describe('Non-IAB region handling', () => {
		it('should skip initialization when prefetchedGVL is null (204 response)', async () => {
			await initializeIABMode(mockState.iab!.config, storeAccess, null);

			// Should not call set or import anything
			expect(mockSet).not.toHaveBeenCalled();
		});
	});

	describe('GVL loading', () => {
		it('should use prefetched GVL when provided', async () => {
			const { fetchGVL, initializeIABStub, createCMPApi } = await import(
				'../../iab-tcf'
			);

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			expect(initializeIABStub).toHaveBeenCalled();
			expect(fetchGVL).not.toHaveBeenCalled();
			expect(createCMPApi).toHaveBeenCalledWith(
				expect.objectContaining({
					gvl: sampleGVL,
				})
			);
		});

		it('should fetch GVL when not prefetched', async () => {
			const { fetchGVL, initializeIABStub } = await import('../../iab-tcf');
			vi.mocked(fetchGVL).mockResolvedValue(sampleGVL);

			await initializeIABMode(mockState.iab!.config, storeAccess, undefined);

			expect(initializeIABStub).toHaveBeenCalled();
			expect(fetchGVL).toHaveBeenCalled();
		});

		it('should skip initialization when fetched GVL is null (non-IAB region)', async () => {
			const { fetchGVL, createCMPApi } = await import('../../iab-tcf');
			vi.mocked(fetchGVL).mockResolvedValue(null);

			await initializeIABMode(mockState.iab!.config, storeAccess, undefined);

			// Should stop after getting null GVL
			expect(createCMPApi).not.toHaveBeenCalled();
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						isLoadingGVL: false,
					}),
				})
			);
		});

		it('should mark GVL as loading initially', async () => {
			const { fetchGVL } = await import('../../iab-tcf');
			vi.mocked(fetchGVL).mockResolvedValue(sampleGVL);

			await initializeIABMode(mockState.iab!.config, storeAccess, undefined);

			// First call should set isLoadingGVL to true
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						isLoadingGVL: true,
					}),
				})
			);
		});
	});

	describe('Vendor initialization', () => {
		it('should initialize vendor consents based on purposes', async () => {
			const { fetchGVL } = await import('../../iab-tcf');
			vi.mocked(fetchGVL).mockResolvedValue(sampleGVL);

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			// Vendor 1 has purposes, should be initialized to false
			// Vendor 2 has no purposes, should not be in vendorConsents
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						vendorConsents: expect.objectContaining({
							'1': false,
						}),
					}),
				})
			);
		});

		it('should initialize vendor legitimate interests based on legIntPurposes', async () => {
			const { fetchGVL } = await import('../../iab-tcf');
			vi.mocked(fetchGVL).mockResolvedValue(sampleGVL);

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			// Vendor 1 has legIntPurposes, should be initialized to true
			// Vendor 2 has legIntPurposes, should be initialized to true
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						vendorLegitimateInterests: expect.objectContaining({
							'1': true,
							'2': true,
						}),
					}),
				})
			);
		});
	});

	describe('Custom vendors', () => {
		it('should initialize custom vendors from config', async () => {
			const configWithCustomVendors = {
				...mockState.iab!.config,
				customVendors: [
					{
						id: 'custom-1',
						name: 'Custom Vendor 1',
						purposes: [1, 2],
						legIntPurposes: [],
						policyUrl: 'https://example.com/privacy',
					},
					{
						id: 'custom-2',
						name: 'Custom Vendor 2',
						purposes: [],
						legIntPurposes: [1],
						policyUrl: 'https://example.com/privacy',
					},
				],
			};

			await initializeIABMode(configWithCustomVendors, storeAccess, sampleGVL);

			// Custom vendor 1 has purposes, should be in vendorConsents
			// Custom vendor 2 has legIntPurposes, should be in vendorLegitimateInterests
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						vendorConsents: expect.objectContaining({
							'custom-1': false,
						}),
						vendorLegitimateInterests: expect.objectContaining({
							'custom-2': true,
						}),
					}),
				})
			);
		});

		it('should store non-IAB vendors in state', async () => {
			const customVendors = [
				{
					id: 'custom-1',
					name: 'Custom Vendor 1',
					purposes: [1],
					legIntPurposes: [],
					policyUrl: 'https://example.com/privacy',
				},
			];

			const configWithCustomVendors = {
				...mockState.iab!.config,
				customVendors,
			};

			await initializeIABMode(configWithCustomVendors, storeAccess, sampleGVL);

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						nonIABVendors: customVendors,
					}),
				})
			);
		});
	});

	describe('Persisted consent restoration', () => {
		it('should merge stored custom vendor consents', async () => {
			const { getConsentFromStorage } = await import('../../cookie');
			vi.mocked(getConsentFromStorage).mockReturnValue({
				iabCustomVendorConsents: {
					'custom-1': true,
				},
				iabCustomVendorLegitimateInterests: {
					'custom-2': false,
				},
			});

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			// Stored consents should be merged
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						vendorConsents: expect.objectContaining({
							'custom-1': true,
						}),
						vendorLegitimateInterests: expect.objectContaining({
							'custom-2': false,
						}),
					}),
				})
			);
		});
	});

	describe('CMP API initialization', () => {
		it('should create CMP API with correct config', async () => {
			const { createCMPApi } = await import('../../iab-tcf');

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			expect(createCMPApi).toHaveBeenCalledWith({
				cmpId: 160,
				cmpVersion: 1,
				gvl: sampleGVL,
				gdprApplies: true,
			});
		});

		it('should use default CMP ID and version when not configured', async () => {
			const { createCMPApi } = await import('../../iab-tcf');

			const minimalConfig = {
				enabled: true,
				publisherCountryCode: 'GB',
				isServiceSpecific: true,
			};

			await initializeIABMode(minimalConfig, storeAccess, sampleGVL);

			// Default CMP ID is 0 and version comes from the package version
			expect(createCMPApi).toHaveBeenCalledWith(
				expect.objectContaining({
					gvl: sampleGVL,
					gdprApplies: true,
				})
			);
		});

		it('should store CMP API in state', async () => {
			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						cmpApi: mockCmpApi,
					}),
				})
			);
		});
	});

	describe('TC String restoration', () => {
		it('should restore consent from existing TC String', async () => {
			const tcString =
				'CPhJRpMPhJRpMAGABCENCWCsAP_AAH_AAAAAHfoBpDxkBSFCAGJoYtkgAAAGxwAAICACABAAoAAAABoAIAQAAAAQAAAgBAAAABIAIAIAAABAGEAAAAAAQAAAAQAAAEAAAAAAIQIAAAAAAiBAAAAAAAAAAAAAAAQAAAAAAAAAAAIQIAAAAAACBAAAEggAAAAAAAAAAAAAAAAgAAAAAAAAAQQBAAAACAHEAB4AA';

			mockLoadFromStorage.mockReturnValue(tcString);
			const { decodeTCString, iabPurposesToC15tConsents } = await import(
				'../../iab-tcf'
			);

			vi.mocked(decodeTCString).mockResolvedValue({
				purposeConsents: { 1: true, 2: false },
				purposeLegitimateInterests: { 1: true },
				vendorConsents: { 1: true },
				vendorLegitimateInterests: { 1: true },
				specialFeatureOptIns: { 1: true },
			});
			vi.mocked(iabPurposesToC15tConsents).mockReturnValue({
				necessary: true,
				functionality: false,
				experience: false,
				marketing: false,
				measurement: false,
			});

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			expect(decodeTCString).toHaveBeenCalledWith(tcString);
			expect(iabPurposesToC15tConsents).toHaveBeenCalled();
		});

		it('should update core consent state when restoring from TC String', async () => {
			const tcString = 'valid-tc-string';

			mockLoadFromStorage.mockReturnValue(tcString);
			const { decodeTCString, iabPurposesToC15tConsents } = await import(
				'../../iab-tcf'
			);

			vi.mocked(decodeTCString).mockResolvedValue({
				purposeConsents: { 1: true },
				purposeLegitimateInterests: {},
				vendorConsents: {},
				vendorLegitimateInterests: {},
				specialFeatureOptIns: {},
			});
			const c15tConsents = {
				necessary: true,
				functionality: true,
				experience: true,
				marketing: true,
				measurement: true,
			};
			vi.mocked(iabPurposesToC15tConsents).mockReturnValue(c15tConsents);

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			// Should update core consent state
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: c15tConsents,
					selectedConsents: c15tConsents,
					activeUI: 'none',
				})
			);
		});
	});

	describe('Error handling', () => {
		it('should handle errors gracefully and stop loading', async () => {
			const { fetchGVL } = await import('../../iab-tcf');
			const error = new Error('Failed to fetch GVL');
			vi.mocked(fetchGVL).mockRejectedValue(error);

			const consoleSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});

			await initializeIABMode(mockState.iab!.config, storeAccess, undefined);

			expect(consoleSpy).toHaveBeenCalledWith(
				'Failed to initialize IAB mode:',
				error
			);
			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					iab: expect.objectContaining({
						isLoadingGVL: false,
					}),
				})
			);

			consoleSpy.mockRestore();
		});

		it('should handle invalid TC String silently', async () => {
			const tcString = 'invalid-tc-string';

			mockLoadFromStorage.mockReturnValue(tcString);
			const { decodeTCString } = await import('../../iab-tcf');

			vi.mocked(decodeTCString).mockRejectedValue(
				new Error('Invalid TC String')
			);

			// Should not throw
			await expect(
				initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL)
			).resolves.toBeUndefined();
		});
	});

	describe('Null IAB state handling', () => {
		it('should handle null IAB state gracefully', async () => {
			mockState.iab = null;

			const { fetchGVL } = await import('../../iab-tcf');
			vi.mocked(fetchGVL).mockResolvedValue(sampleGVL);

			// Should not throw
			await expect(
				initializeIABMode(
					{
						enabled: true,
						cmpId: 160,
						cmpVersion: 1,
						publisherCountryCode: 'GB',
						isServiceSpecific: true,
					},
					storeAccess,
					sampleGVL
				)
			).resolves.toBeUndefined();
		});
	});

	describe('Script updates', () => {
		it('should call updateScripts after initialization', async () => {
			const updateScripts = vi
				.fn()
				.mockReturnValue({ loaded: [], unloaded: [] });
			mockState.updateScripts = updateScripts;

			await initializeIABMode(mockState.iab!.config, storeAccess, sampleGVL);

			expect(updateScripts).toHaveBeenCalled();
		});
	});

	describe('CMP ID validation', () => {
		it('should warn about placeholder CMP IDs in development', async () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const configWithPlaceholderId = {
				...mockState.iab!.config,
				cmpId: 1, // Placeholder ID
			};

			await initializeIABMode(configWithPlaceholderId, storeAccess, sampleGVL);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Using CMP ID 1')
			);

			consoleSpy.mockRestore();
		});
	});
});
