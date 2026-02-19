/**
 * Tests for store-updater CMP ID merging and GPC override.
 *
 * @vitest-environment jsdom
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hasGlobalPrivacyControlSignal } from '../../global-privacy-control';
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

describe('updateStore - GPC override', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let mockState: ReturnType<typeof createMockStoreState>;

	beforeEach(async () => {
		vi.clearAllMocks();
		const { initializeIABMode } = await import('../iab-initializer');
		vi.mocked(initializeIABMode).mockResolvedValue(undefined);
		vi.mocked(hasGlobalPrivacyControlSignal).mockReturnValue(false);
	});

	function setup(overrides?: { gpc?: boolean }, jurisdiction = 'CCPA') {
		mockState = createMockStoreState({
			iab: null,
			overrides: overrides ? { gpc: overrides.gpc } : undefined,
		});
		mockGet = vi.fn().mockReturnValue(mockState);
		mockSet = vi.fn((partial) => {
			Object.assign(mockState, partial);
		});

		const data = createMockConsentBannerResponse({ jurisdiction });
		const config = {
			get: mockGet,
			set: mockSet,
			manager: {} as InitConsentManagerConfig['manager'],
			initialTranslationConfig: undefined,
		};

		return { data, config };
	}

	it('should deny marketing/measurement when GPC override is true in opt-out jurisdiction', () => {
		const { data, config } = setup({ gpc: true }, 'CCPA');

		updateStore(data, config, true);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consents: expect.objectContaining({
					marketing: false,
					measurement: false,
					necessary: true,
				}),
			})
		);
	});

	it('should allow marketing/measurement when GPC override is false in opt-out jurisdiction', () => {
		// Even if browser has GPC active, the override should suppress it
		vi.mocked(hasGlobalPrivacyControlSignal).mockReturnValue(true);
		const { data, config } = setup({ gpc: false }, 'CCPA');

		updateStore(data, config, true);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consents: expect.objectContaining({
					marketing: true,
					measurement: true,
				}),
			})
		);
	});

	it('should fall back to browser GPC signal when override is undefined', () => {
		vi.mocked(hasGlobalPrivacyControlSignal).mockReturnValue(true);
		const { data, config } = setup(undefined, 'CCPA');

		updateStore(data, config, true);

		expect(hasGlobalPrivacyControlSignal).toHaveBeenCalled();
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consents: expect.objectContaining({
					marketing: false,
					measurement: false,
				}),
			})
		);
	});

	it('should have no effect on opt-in (GDPR) jurisdictions regardless of GPC override', () => {
		const { data, config } = setup({ gpc: true }, 'GDPR');

		updateStore(data, config, true);

		// In GDPR jurisdiction, the model is 'opt-in' so consents are NOT auto-granted
		// (user must explicitly consent). GPC override should not change this behavior.
		const setCallArgs = mockSet.mock.calls;
		const consentsUpdate = setCallArgs.find(
			(call: unknown[]) =>
				call[0] &&
				typeof call[0] === 'object' &&
				'consents' in (call[0] as Record<string, unknown>)
		);
		// No consents should be auto-granted in GDPR jurisdiction
		expect(consentsUpdate).toBeUndefined();
	});
});
