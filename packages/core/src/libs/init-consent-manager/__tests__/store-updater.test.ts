/**
 * Tests for store-updater CMP ID merging and GPC override.
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

const setGlobalPrivacyControlSignal = function setGlobalPrivacyControlSignal(
	value: boolean | string | undefined
) {
	Object.defineProperty(window.navigator, 'globalPrivacyControl', {
		configurable: true,
		value,
	});
};

describe('updateStore - cmpId merging', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let mockState: ReturnType<typeof createMockStoreState>;

	beforeEach(() => {
		vi.clearAllMocks();

		mockState = createMockStoreState({
			iab: {
				cmpApi: null,
				config: {
					cmpId: 50,
					cmpVersion: 1,
					enabled: true,
					isServiceSpecific: true,
					publisherCountryCode: 'GB',
				},
				gvl: null,
				isLoadingGVL: false,
				nonIABVendors: [],
				preferenceCenterTab: 'purposes',
				purposeConsents: {},
				purposeLegitimateInterests: {},
				specialFeatureOptIns: {},
				tcString: null,
				vendorConsents: {},
				vendorLegitimateInterests: {},
				vendorsDisclosed: {},
			},
		});

		mockGet = vi.fn().mockReturnValue(mockState);
		mockSet = vi.fn((partial) => {
			Object.assign(mockState, partial);
		});
	});

	it('should override client cmpId with server-provided cmpId', async () => {
		const data = createMockConsentBannerResponse({
			cmpId: 99,
			gvl: {
				dataCategories: {},
				features: {},
				gvlSpecificationVersion: 3,
				lastUpdated: '2024-01-01',
				purposes: {},
				specialFeatures: {},
				specialPurposes: {},
				stacks: {},
				tcfPolicyVersion: 5,
				vendorListVersion: 1,
				vendors: {},
			},
			jurisdiction: 'GDPR',
		});

		const config = {
			get: mockGet,
			initialTranslationConfig: undefined,
			manager: {} as InitConsentManagerConfig['manager'],
			set: mockSet,
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
			gvl: {
				dataCategories: {},
				features: {},
				gvlSpecificationVersion: 3,
				lastUpdated: '2024-01-01',
				purposes: {},
				specialFeatures: {},
				specialPurposes: {},
				stacks: {},
				tcfPolicyVersion: 5,
				vendorListVersion: 1,
				vendors: {},
			},
			jurisdiction: 'GDPR',
		});

		const config = {
			get: mockGet,
			initialTranslationConfig: undefined,
			manager: {} as InitConsentManagerConfig['manager'],
			set: mockSet,
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
			gvl: null,
			jurisdiction: 'GDPR',
		});

		const config = {
			get: mockGet,
			initialTranslationConfig: undefined,
			manager: {} as InitConsentManagerConfig['manager'],
			set: mockSet,
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

	beforeEach(() => {
		vi.clearAllMocks();
		setGlobalPrivacyControlSignal(undefined);
	});

	const setup = function setup(
		overrides?: { gpc?: boolean },
		jurisdiction = 'CCPA'
	) {
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
			initialTranslationConfig: undefined,
			manager: {} as InitConsentManagerConfig['manager'],
			set: mockSet,
		};

		return { config, data };
	};

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
		setGlobalPrivacyControlSignal(true);
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
		setGlobalPrivacyControlSignal(true);
		const { data, config } = setup(undefined, 'CCPA');

		await updateStore(data, config, true);

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
					common: {
						acceptAll: 'Alle akzeptieren',
						customize: 'Anpassen',
						rejectAll: 'Alle ablehnen',
						save: 'Speichern',
					},
					consentManagerDialog: {
						description: 'Einstellungen',
						title: 'Datenschutz',
					},
					consentTypes: {
						experience: { description: 'Erlebnis', title: 'Erlebnis' },
						functionality: { description: 'Funktional', title: 'Funktional' },
						marketing: { description: 'Marketing', title: 'Marketing' },
						measurement: { description: 'Analyse', title: 'Analyse' },
						necessary: { description: 'Notwendig', title: 'Notwendig' },
					},
					cookieBanner: {
						description: 'Deutsche Beschreibung',
						title: 'Deutscher Titel',
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
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
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

	it('treats strict out-of-policy categories as out-of-scope (hidden and false)', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			policy: {
				consent: {
					categories: ['necessary', 'measurement'],
					scopeMode: 'strict',
				},
				id: 'policy_jp_restricted',
				model: 'opt-in',
			},
		});
		const mockState = createMockStoreState({
			consentCategories: [
				'necessary',
				'measurement',
				'experience',
				'marketing',
				'functionality',
			],
			consents: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
			iab: null,
			selectedConsents: {
				experience: true,
				functionality: true,
				marketing: true,
				measurement: true,
				necessary: true,
			},
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				initialTranslationConfig: undefined,
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consentCategories: ['necessary', 'measurement'],
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: true,
					necessary: true,
				},
			})
		);
	});

	it('keeps configured categories visible for permissive policy scope', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			policy: {
				consent: {
					categories: ['necessary'],
					scopeMode: 'permissive',
				},
				id: 'policy_eu_permissive',
				model: 'opt-in',
			},
		});
		const mockState = createMockStoreState({
			consentCategories: ['necessary', 'measurement', 'marketing'],
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			iab: null,
			selectedConsents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				initialTranslationConfig: undefined,
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
			},
			true
		);

		expect(mockSet).not.toHaveBeenCalledWith(
			expect.objectContaining({
				consentCategories: expect.any(Array),
			})
		);
	});

	it('does not restrict categories when policy purpose scope is wildcard', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			policy: {
				consent: {
					categories: ['*'],
				},
				id: 'policy_iab',
				model: 'iab',
			},
		});
		const mockState = createMockStoreState({
			consentCategories: ['necessary', 'measurement', 'marketing'],
			iab: null,
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				initialTranslationConfig: undefined,
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
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
				consent: {
					categories: ['necessary', 'functionality', 'measurement'],
					preselectedCategories: ['functionality', 'marketing'],
					scopeMode: 'strict',
				},
				id: 'policy_uk',
				model: 'opt-in',
			},
		});
		const mockState = createMockStoreState({
			consentInfo: null,
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			iab: null,
			selectedConsents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				initialTranslationConfig: undefined,
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				consents: {
					experience: false,
					functionality: false,
					marketing: false,
					measurement: false,
					necessary: true,
				},
				selectedConsents: {
					experience: false,
					functionality: true,
					marketing: false,
					measurement: false,
					necessary: true,
				},
			})
		);
	});

	it('preselects out-of-policy configured categories in permissive scope', async () => {
		const data = createMockConsentBannerResponse({
			jurisdiction: 'GDPR',
			policy: {
				consent: {
					categories: ['necessary'],
					preselectedCategories: ['marketing', 'measurement'],
					scopeMode: 'permissive',
				},
				id: 'policy_eu_permissive',
				model: 'opt-in',
			},
		});
		const mockState = createMockStoreState({
			consentCategories: ['necessary', 'marketing'],
			consentInfo: null,
			consents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
			iab: null,
			selectedConsents: {
				experience: false,
				functionality: false,
				marketing: false,
				measurement: false,
				necessary: true,
			},
		});
		const mockGet = vi.fn().mockReturnValue(mockState);
		const mockSet = vi.fn();

		await updateStore(
			data,
			{
				get: mockGet,
				initialTranslationConfig: undefined,
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				selectedConsents: expect.objectContaining({
					marketing: true,
					measurement: false,
					necessary: true,
				}),
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
						direction: 'row',
						layout: [['reject', 'accept']],
						primaryActions: ['accept'],
						scrollLock: true,
						uiProfile: 'balanced',
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
				initialTranslationConfig: undefined,
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				policyBanner: {
					allowedActions: ['accept', 'reject'],
					direction: 'row',
					layout: [['reject', 'accept']],
					primaryActions: ['accept'],
					scrollLock: true,
					uiProfile: 'balanced',
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
					dialog: {
						allowedActions: ['customize'],
						direction: 'row',
						layout: [['customize']],
						primaryActions: ['customize'],
						scrollLock: false,
						uiProfile: 'balanced',
					},
					mode: 'dialog',
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
				initialTranslationConfig: undefined,
				manager: {} as InitConsentManagerConfig['manager'],
				set: mockSet,
			},
			true
		);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				policyBanner: {
					allowedActions: undefined,
					direction: undefined,
					layout: undefined,
					primaryActions: undefined,
					scrollLock: undefined,
					uiProfile: undefined,
				},
				policyDialog: {
					allowedActions: ['customize'],
					direction: 'row',
					layout: [['customize']],
					primaryActions: ['customize'],
					scrollLock: false,
					uiProfile: 'balanced',
				},
			})
		);
	});
});
