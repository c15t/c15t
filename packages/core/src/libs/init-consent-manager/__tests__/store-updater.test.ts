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

	it('should override client cmpId with server-provided cmpId', async () => {
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

		await updateStore(data, config, true, data.gvl);

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

	it('should keep client cmpId when server does not provide one', async () => {
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

		await updateStore(data, config, true, data.gvl);

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

	it('should disable client IAB config when the response has no GVL', async () => {
		const consoleWarnSpy = vi
			.spyOn(console, 'warn')
			.mockImplementation(() => {});
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			gvl: null,
		});

		const config = {
			get: mockGet,
			set: mockSet,
			manager: {} as InitConsentManagerConfig['manager'],
			initialTranslationConfig: undefined,
		};

		await updateStore(data, config, true, data.gvl);

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'IAB mode disabled: Server returned 200 without GVL. Client IAB settings overridden.'
		);
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				iab: expect.objectContaining({
					config: expect.objectContaining({
						enabled: false,
					}),
				}),
			})
		);
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

	it('should deny marketing/measurement when GPC override is true in opt-out jurisdiction', async () => {
		const { data, config } = setup({ gpc: true }, 'CCPA');

		await updateStore(data, config, true);

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

	it('should allow marketing/measurement when GPC override is false in opt-out jurisdiction', async () => {
		// Even if browser has GPC active, the override should suppress it
		vi.mocked(hasGlobalPrivacyControlSignal).mockReturnValue(true);
		const { data, config } = setup({ gpc: false }, 'CCPA');

		await updateStore(data, config, true);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consents: expect.objectContaining({
					marketing: true,
					measurement: true,
				}),
			})
		);
	});

	it('should fall back to browser GPC signal when override is undefined', async () => {
		vi.mocked(hasGlobalPrivacyControlSignal).mockReturnValue(true);
		const { data, config } = setup(undefined, 'CCPA');

		await updateStore(data, config, true);

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

	it('should have no effect on opt-in (GDPR) jurisdictions regardless of GPC override', async () => {
		const { data, config } = setup({ gpc: true }, 'GDPR');

		await updateStore(data, config, true);

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

describe('updateStore - translation precedence', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('keeps server/runtime language as default language when initial config has a different default', async () => {
		const data = createMockConsentBannerResponse({
			translations: {
				language: 'de',
				translations: {
					cookieBanner: {
						title: 'Deutscher Titel',
						description: 'Deutsche Beschreibung',
					},
					consentManagerDialog: {
						title: 'Datenschutz',
						description: 'Einstellungen',
					},
					common: {
						acceptAll: 'Alle akzeptieren',
						rejectAll: 'Alle ablehnen',
						customize: 'Anpassen',
						save: 'Speichern',
					},
					consentTypes: {
						necessary: { title: 'Notwendig', description: 'Notwendig' },
						functionality: { title: 'Funktional', description: 'Funktional' },
						experience: { title: 'Erlebnis', description: 'Erlebnis' },
						marketing: { title: 'Marketing', description: 'Marketing' },
						measurement: { title: 'Analyse', description: 'Analyse' },
					},
				},
			},
		});
		const mockState = createMockStoreState({ iab: null });
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				set: mockSet,
				manager: {} as InitConsentManagerConfig['manager'],
				initialTranslationConfig: {
					defaultLanguage: 'en',
					translations: {
						en: {
							cookieBanner: {
								title: 'English Title',
							},
						},
					},
				},
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				translationConfig: expect.objectContaining({
					defaultLanguage: 'de',
					translations: expect.objectContaining({
						en: expect.objectContaining({
							cookieBanner: expect.objectContaining({
								title: 'English Title',
							}),
						}),
					}),
				}),
			})
		);
	});
});

describe('updateStore - policy purpose/category restrictions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('treats out-of-policy categories as out-of-scope (hidden and false)', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			policy: {
				id: 'policy_jp_restricted',
				model: 'opt-in',
				consent: {
					categories: ['necessary', 'measurement'],
				},
			},
		});
		const mockState = createMockStoreState({
			iab: null,
			consentCategories: [
				'necessary',
				'measurement',
				'experience',
				'marketing',
				'functionality',
			],
			consents: {
				necessary: true,
				measurement: true,
				experience: true,
				marketing: true,
				functionality: true,
			},
			selectedConsents: {
				necessary: true,
				measurement: true,
				experience: true,
				marketing: true,
				functionality: true,
			},
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				set: mockSet,
				manager: {} as InitConsentManagerConfig['manager'],
				initialTranslationConfig: undefined,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consentCategories: ['necessary', 'measurement'],
				consents: {
					necessary: true,
					functionality: false,
					experience: false,
					marketing: false,
					measurement: true,
				},
				selectedConsents: {
					necessary: true,
					functionality: false,
					experience: false,
					marketing: false,
					measurement: true,
				},
			})
		);
	});

	it('does not restrict categories when policy purpose scope is wildcard', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			policy: {
				id: 'policy_iab',
				model: 'iab',
				consent: {
					categories: ['*'],
				},
			},
		});
		const mockState = createMockStoreState({
			iab: null,
			consentCategories: ['necessary', 'measurement', 'marketing'],
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				set: mockSet,
				manager: {} as InitConsentManagerConfig['manager'],
				initialTranslationConfig: undefined,
			},
			true
		);

		expect(mockSet).not.toHaveBeenCalledWith(
			expect.objectContaining({
				consentCategories: expect.any(Array),
			})
		);
	});

	it('preselects configured categories on first visit without granting consent', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'UK_GDPR',
			policy: {
				id: 'policy_uk',
				model: 'opt-in',
				consent: {
					categories: ['necessary', 'functionality', 'measurement'],
					preselectedCategories: ['functionality', 'marketing'],
				},
			},
		});
		const mockState = createMockStoreState({
			iab: null,
			consentInfo: null,
			consents: {
				necessary: true,
				functionality: false,
				experience: false,
				marketing: false,
				measurement: false,
			},
			selectedConsents: {
				necessary: true,
				functionality: false,
				experience: false,
				marketing: false,
				measurement: false,
			},
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				set: mockSet,
				manager: {} as InitConsentManagerConfig['manager'],
				initialTranslationConfig: undefined,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consents: {
					necessary: true,
					functionality: false,
					experience: false,
					marketing: false,
					measurement: false,
				},
				selectedConsents: {
					necessary: true,
					functionality: true,
					experience: false,
					marketing: false,
					measurement: false,
				},
			})
		);
	});

	it('stores policy UI action order/layout hints from init response', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'CCPA',
			policy: {
				id: 'policy_us_ca',
				model: 'opt-in',
				ui: {
					banner: {
						allowedActions: ['accept', 'reject'],
						primaryAction: 'accept',
						actionOrder: ['reject', 'accept'],
						actionLayout: 'inline',
						uiProfile: 'balanced',
						scrollLock: true,
					},
				},
			},
		});
		const mockState = createMockStoreState({ iab: null });
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				set: mockSet,
				manager: {} as InitConsentManagerConfig['manager'],
				initialTranslationConfig: undefined,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				policyBanner: {
					allowedActions: ['accept', 'reject'],
					primaryAction: 'accept',
					actionOrder: ['reject', 'accept'],
					actionLayout: 'inline',
					uiProfile: 'balanced',
					scrollLock: true,
				},
			})
		);
	});

	it('stores dialog policy UI fields independently from banner fields', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'CCPA',
			policy: {
				id: 'policy_us_country',
				model: 'opt-out',
				ui: {
					mode: 'dialog',
					dialog: {
						allowedActions: ['customize'],
						primaryAction: 'customize',
						actionOrder: ['customize'],
						actionLayout: 'inline',
						uiProfile: 'balanced',
						scrollLock: false,
					},
				},
			},
		});
		const mockState = createMockStoreState({ iab: null });
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				set: mockSet,
				manager: {} as InitConsentManagerConfig['manager'],
				initialTranslationConfig: undefined,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				policyDialog: {
					allowedActions: ['customize'],
					primaryAction: 'customize',
					actionOrder: ['customize'],
					actionLayout: 'inline',
					uiProfile: 'balanced',
					scrollLock: false,
				},
				policyBanner: {
					allowedActions: undefined,
					primaryAction: undefined,
					actionOrder: undefined,
					actionLayout: undefined,
					uiProfile: undefined,
					scrollLock: undefined,
				},
			})
		);
	});
});
