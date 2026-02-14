/**
 * Tests for store-updater CMP ID merging.
 *
 * @vitest-environment jsdom
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateStore } from '../store-updater';
import type { InitConsentManagerConfig } from '../types';
import {
	createMockConsentBannerResponse,
	createMockStoreState,
} from './test-setup';

vi.mock('../../global-privacy-control', () => ({
	hasGlobalPrivacyControlSignal: vi.fn().mockReturnValue(false),
}));

// Mock IAB initializer to prevent actual initialization
vi.mock('../iab-initializer', () => ({
	initializeIABMode: vi.fn().mockResolvedValue(undefined),
}));

describe('updateStore - cmpId merging', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let mockState: ReturnType<typeof createMockStoreState>;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Re-apply mockResolvedValue after clearAllMocks
		const { initializeIABMode } = await import('../iab-initializer');
		vi.mocked(initializeIABMode).mockResolvedValue(undefined);

		mockState = createMockStoreState({
			iab: {
				config: {
					enabled: true,
					cmpId: 50,
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
	});

	it('should override client cmpId with server-provided cmpId', () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			gvl: {
				gvlSpecificationVersion: 3,
				vendorListVersion: 1,
				tcfPolicyVersion: 5,
				lastUpdated: '2024-01-01',
				purposes: {},
				specialPurposes: {},
				features: {},
				specialFeatures: {},
				vendors: {},
				stacks: {},
				dataCategories: {},
			},
			cmpId: 99,
		});

		const config = {
			get: mockGet,
			set: mockSet,
			manager: {} as InitConsentManagerConfig['manager'],
			initialTranslationConfig: undefined,
		};

		updateStore(data, config, true, data.gvl);

		// The store should have the server-provided cmpId
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				iab: expect.objectContaining({
					config: expect.objectContaining({
						cmpId: 99,
					}),
				}),
			})
		);
	});

	it('should keep client cmpId when server does not provide one', () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			gvl: {
				gvlSpecificationVersion: 3,
				vendorListVersion: 1,
				tcfPolicyVersion: 5,
				lastUpdated: '2024-01-01',
				purposes: {},
				specialPurposes: {},
				features: {},
				specialFeatures: {},
				vendors: {},
				stacks: {},
				dataCategories: {},
			},
		});

		const config = {
			get: mockGet,
			set: mockSet,
			manager: {} as InitConsentManagerConfig['manager'],
			initialTranslationConfig: undefined,
		};

		updateStore(data, config, true, data.gvl);

		// The store should NOT have been updated with a new iab config
		// (no cmpId from server means no override)
		const setCallArgs = mockSet.mock.calls;
		const iabUpdate = setCallArgs.find(
			(call: unknown[]) =>
				call[0] &&
				typeof call[0] === 'object' &&
				'iab' in (call[0] as Record<string, unknown>)
		);
		// Should not have set iab since no server cmpId and no GVL disabled
		expect(iabUpdate).toBeUndefined();
	});
});
