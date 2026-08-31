/**
 * Tests for initConsentManager.
 *
 * @vitest-environment jsdom
 * @packageDocumentation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';

import type { ConsentManagerInterface } from '../../../client/client-factory';
import type { ConsentStoreState } from '../../../store/type';
import { initConsentManager } from '../index';
import {
	createMockConsentBannerResponse,
	createMockConsentManager,
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

describe('initConsentManager', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let storeGet: StoreApi<ConsentStoreState>['getState'];
	let storeSet: StoreApi<ConsentStoreState>['setState'];
	let mockManager: ConsentManagerInterface;
	let mockState: ConsentStoreState;

	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
		setGlobalPrivacyControlSignal(undefined);

		mockGet = vi.fn();
		mockSet = vi.fn();
		storeGet = mockGet as unknown as StoreApi<ConsentStoreState>['getState'];
		storeSet = mockSet as unknown as StoreApi<ConsentStoreState>['setState'];

		mockState = createMockStoreState({
			callbacks: {
				onBannerFetched: vi.fn(),
				onError: vi.fn(),
			},
			hasConsented: vi.fn().mockReturnValue(false),
		});

		mockGet.mockReturnValue(mockState);
		mockManager = createMockConsentManager();
	});

	describe('Environment checks', () => {
		it('should return undefined when window is undefined (SSR)', async () => {
			const originalWindow = globalThis.window;
			try {
				// oxlint-disable-next-line typescript/no-explicit-any -- Testing environment setup
				(globalThis as any).window = undefined;

				const result = await initConsentManager({
					get: storeGet,
					manager: mockManager,
					set: storeSet,
				});

				expect(result).toBeUndefined();
				expect(mockSet).not.toHaveBeenCalled();
			} finally {
				globalThis.window = originalWindow;
			}
		});

		it('should return undefined when localStorage is not accessible', async () => {
			const originalLocalStorage = window.localStorage;
			// oxlint-disable-next-line typescript/no-explicit-any -- Testing localStorage access
			(window as any).localStorage = {
				removeItem: vi.fn(),
				setItem: vi.fn().mockImplementation(() => {
					throw new Error('localStorage not available');
				}),
			};

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({
				activeUI: 'none',
				isLoadingConsentInfo: false,
			});

			window.localStorage = originalLocalStorage;
		});
	});

	describe('Initial data handling', () => {
		it('should replay pending consent sync with policy snapshot token', async () => {
			window.localStorage.setItem(
				'c15t:pending-consent-sync',
				JSON.stringify({
					domain: 'example.com',
					givenAt: 1_746_000_000_000,
					jurisdiction: 'GDPR',
					jurisdictionModel: 'opt-in',
					policySnapshotToken: 'snapshot-token-123',
					preferences: {
						experience: false,
						functionality: false,
						marketing: false,
						measurement: false,
						necessary: true,
					},
					subjectId: 'existing-subject',
					type: 'custom',
					uiSource: 'dialog',
				})
			);

			mockManager = createMockConsentManager({
				init: vi.fn().mockResolvedValue({
					data: createMockConsentBannerResponse(),
					error: null,
				}),
				setConsent: vi.fn().mockResolvedValue({
					data: undefined,
					error: null,

					ok: true,
				}),
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockManager.setConsent).toHaveBeenCalledWith({
				body: expect.objectContaining({
					policySnapshotToken: 'snapshot-token-123',
					uiSource: 'dialog',
				}),
			});
			expect(
				window.localStorage.getItem('c15t:pending-consent-sync')
			).toBeNull();
		});

		it('should use initial data when provided and valid', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const ssrData = Promise.resolve({
				gvl: undefined,
				init: mockResponse,
			});

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).not.toHaveBeenCalled();
		});

		it('should fall back to API call when initial data is undefined', async () => {
			const ssrData = Promise.resolve(undefined);
			const mockResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).toHaveBeenCalled();
		});

		it('should fall back to API call when initial data init is undefined', async () => {
			const ssrData = Promise.resolve({
				gvl: undefined,
				init: undefined,
			});
			const mockResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).toHaveBeenCalled();
		});

		it('reuses initial data when overrides match the stored request context', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const ssrData = Promise.resolve({
				gvl: undefined,
				init: mockResponse,
				metadata: {
					requestContext: {
						backendURL: `${window.location.origin}/api/c15t`,
						country: 'DE',
						gpc: false,
						language: 'de',
						region: 'BE',
					},
				},
			});

			mockState.overrides = {
				country: 'DE',
				language: 'de',
				region: 'BE',
			};

			const result = await initConsentManager({
				backendURL: '/api/c15t',
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).not.toHaveBeenCalled();
		});

		it('falls back to API when overrides mismatch the stored request context', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const ssrData = Promise.resolve({
				gvl: undefined,
				init: mockResponse,
				metadata: {
					requestContext: {
						backendURL: `${window.location.origin}/api/c15t`,
						country: 'DE',
						gpc: false,
						language: 'de',
						region: 'BE',
					},
				},
			});

			mockState.overrides = {
				country: 'DE',
				language: 'fr',
				region: 'BE',
			};

			const apiResponse = createMockConsentBannerResponse({
				location: { countryCode: 'DE', regionCode: 'BE' },
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: apiResponse,
				error: null,
			});

			const result = await initConsentManager({
				backendURL: '/api/c15t',
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(result).toEqual(apiResponse);
			expect(mockManager.init).toHaveBeenCalled();
			expect(mockSet).toHaveBeenCalledWith({
				ssrDataUsed: false,
				ssrSkippedReason: 'context_mismatch',
			});
		});

		it('falls back to API when GPC mismatches the stored request context', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const ssrData = Promise.resolve({
				gvl: undefined,
				init: mockResponse,
				metadata: {
					requestContext: {
						backendURL: `${window.location.origin}/api/c15t`,
						country: null,
						gpc: false,
						language: null,
						region: null,
					},
				},
			});

			mockState.overrides = {
				gpc: true,
			};

			const apiResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: apiResponse,
				error: null,
			});

			const result = await initConsentManager({
				backendURL: '/api/c15t',
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(result).toEqual(apiResponse);
			expect(mockManager.init).toHaveBeenCalled();
			expect(mockSet).toHaveBeenCalledWith({
				ssrDataUsed: false,
				ssrSkippedReason: 'context_mismatch',
			});
		});

		it('reopens consent UI when the active material policy fingerprint changes', async () => {
			const mockResponse = createMockConsentBannerResponse({
				policy: {
					consent: {
						categories: ['necessary', 'measurement'],
						expiryDays: 365,
						scopeMode: 'strict',
					},
					id: 'policy_runtime_gdpr',
					model: 'opt-in',
					ui: {
						banner: {
							allowedActions: ['accept', 'reject'],
							direction: 'row',
							layout: [['accept', 'reject']],
							primaryActions: ['accept'],
						},
						mode: 'banner',
					},
				},
			});
			let state = createMockStoreState({
				consentInfo: {
					materialPolicyFingerprint: 'f'.repeat(64),
					subjectId: 'sub_existing',
					time: 1_700_000_000_000,
				},
				consentTypes: [
					{
						defaultValue: true,
						description: '',
						disabled: true,
						display: true,
						gdprType: 1,

						name: 'necessary',
					},
					{
						defaultValue: false,
						description: '',
						disabled: false,
						display: true,
						gdprType: 4,

						name: 'measurement',
					},
				],
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
			});
			storeGet = (() => state) as StoreApi<ConsentStoreState>['getState'];
			storeSet = ((update) => {
				state = {
					...state,
					...(typeof update === 'function' ? update(state) : update),
				};
			}) as StoreApi<ConsentStoreState>['setState'];

			mockManager = createMockConsentManager({
				init: vi.fn().mockResolvedValue({
					data: mockResponse,
					error: null,
				}),
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(state.consentInfo).toBeNull();
			expect(state.activeUI).toBe('banner');
			expect(state.consents.necessary).toBe(true);
			expect(state.consents.measurement).toBe(false);
		});

		it('seeds the current material policy fingerprint for existing consent without reopening UI', async () => {
			const mockResponse = createMockConsentBannerResponse({
				policy: {
					consent: {
						categories: ['necessary', 'measurement'],
						expiryDays: 365,
						scopeMode: 'strict',
					},
					id: 'policy_runtime_gdpr',
					model: 'opt-in',
					ui: {
						banner: {
							allowedActions: ['accept', 'reject'],
							direction: 'row',
							layout: [['accept', 'reject']],
							primaryActions: ['accept'],
						},
						mode: 'banner',
					},
				},
			});
			let state = createMockStoreState({
				activeUI: 'none',
				consentInfo: {
					subjectId: 'sub_existing',
					time: 1_700_000_000_000,
				},
			});
			storeGet = (() => state) as StoreApi<ConsentStoreState>['getState'];
			storeSet = ((update) => {
				state = {
					...state,
					...(typeof update === 'function' ? update(state) : update),
				};
			}) as StoreApi<ConsentStoreState>['setState'];

			mockManager = createMockConsentManager({
				init: vi.fn().mockResolvedValue({
					data: mockResponse,
					error: null,
				}),
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(state.consentInfo?.materialPolicyFingerprint).toMatch(
				/^[a-f0-9]{64}$/u
			);
			expect(state.activeUI).toBe('none');
		});

		it('should pass overrides as headers to init', async () => {
			mockState.overrides = {
				country: 'FR',
				language: 'fr',
				region: 'IDF',
			};

			const mockResponse = createMockConsentBannerResponse({
				location: { countryCode: 'FR', regionCode: 'IDF' },
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockManager.init).toHaveBeenCalledWith({
				headers: {
					'accept-language': 'fr',
					'x-c15t-country': 'FR',
					'x-c15t-region': 'IDF',
				},
				onError: expect.any(Function),
			});
		});

		it('should only pass defined override headers', async () => {
			mockState.overrides = {
				country: 'CA',
			};

			const mockResponse = createMockConsentBannerResponse({
				location: { countryCode: 'CA', regionCode: null },
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockManager.init).toHaveBeenCalledWith({
				headers: {
					'x-c15t-country': 'CA',
				},
				onError: expect.any(Function),
			});
		});
	});

	describe('API call handling', () => {
		it('should successfully fetch and process consent banner data', async () => {
			const mockResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).toHaveBeenCalledWith({
				headers: {},
				onError: expect.any(Function),
			});
			expect(mockSet).toHaveBeenCalledWith({ isLoadingConsentInfo: true });
		});

		it('should handle API errors gracefully', async () => {
			const errorMessage = 'API request failed';
			mockManager.init = vi.fn().mockResolvedValue({
				data: null,
				error: { message: errorMessage },
			});

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({
				activeUI: 'none',
				isLoadingConsentInfo: false,
			});
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: `Failed to fetch consent banner info: ${errorMessage}`,
			});
		});

		it('should handle network errors and exceptions', async () => {
			const networkError = new Error('Network error');
			mockManager.init = vi.fn().mockRejectedValue(networkError);

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({
				activeUI: 'none',
				isLoadingConsentInfo: false,
			});
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: 'Network error',
			});
		});

		it('should handle unknown errors with fallback message', async () => {
			const unknownError = 'Unknown error';
			mockManager.init = vi.fn().mockRejectedValue(unknownError);

			const result = await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: 'Unknown error fetching consent banner information',
			});
		});
	});

	describe('Store updates', () => {
		it('stores init source as ssr when SSR prefetched data is used', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const ssrData = Promise.resolve({
				gvl: undefined,
				init: mockResponse,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					initDataSource: 'ssr',
					initDataSourceDetail: 'via=ssr',
				})
			);
		});

		it('maps SSR cache metadata to backend-cache-hit source', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const ssrData = Promise.resolve({
				gvl: undefined,
				init: mockResponse,
				metadata: {
					cache: {
						detail: 'x-vercel-cache=HIT, age=12',
						isHit: true,
					},
					requestDurationMs: 42,
				},
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
				ssrData,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					initDataSource: 'backend-cache-hit',
					initDataSourceDetail:
						'via=ssr, x-vercel-cache=HIT, age=12, duration=42ms',
				})
			);
		});

		it('stores backend-cache-hit source from cache headers', async () => {
			const mockResponse = createMockConsentBannerResponse();
			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
				response: new Response(JSON.stringify(mockResponse), {
					headers: {
						'content-type': 'application/json',
						'x-vercel-cache': 'HIT',
					},
					status: 200,
				}),
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					initDataSource: 'backend-cache-hit',
					initDataSourceDetail: 'x-vercel-cache=HIT',
				})
			);
		});

		it('stores offline-fallback source for hosted mode with null response', async () => {
			const mockResponse = createMockConsentBannerResponse();
			mockState.config.mode = 'hosted';
			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
				response: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					initDataSource: 'offline-fallback',
					initDataSourceDetail: null,
				})
			);
		});

		it('stores offline-mode source for offline client mode', async () => {
			const mockResponse = createMockConsentBannerResponse();
			mockState.config.mode = 'offline';
			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
				response: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					initDataSource: 'offline-mode',
					initDataSourceDetail: null,
				})
			);
		});

		it('stores custom source for custom client mode', async () => {
			const mockResponse = createMockConsentBannerResponse();
			mockState.config.mode = 'custom';
			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
				response: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					initDataSource: 'custom',
					initDataSourceDetail: null,
				})
			);
		});

		it('should update store with consent banner data', async () => {
			const mockResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					hasFetchedBanner: true,
					isLoadingConsentInfo: false,
					lastBannerFetchData: mockResponse,
					locationInfo: {
						countryCode: 'DE',
						jurisdiction: mockResponse.jurisdiction ?? null,
						regionCode: 'BE',
					},
					translationConfig: expect.any(Object),
				})
			);
		});

		it('should handle jurisdiction with NONE code correctly (auto-grant consents)', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: 'NONE',
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						experience: true,
						functionality: true,
						marketing: true,
						measurement: true,
						necessary: true,
					},
				})
			);
		});

		it('should honor Global Privacy Control when auto granting consents', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: 'NONE',
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			setGlobalPrivacyControlSignal(true);

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						experience: true,
						functionality: true,
						marketing: false,
						measurement: false,
						necessary: true,
					},
				})
			);
		});

		it('should not auto grant consents when user already has consent info', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: 'NONE',
			});

			mockState.consentInfo = { time: Date.now() };

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.not.objectContaining({
					consents: expect.anything(),
				})
			);
		});

		it('should show banner when consent info is null and jurisdiction is regulated', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: 'GDPR',
			});
			mockState.consentInfo = null;

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					activeUI: 'banner',
				})
			);
		});

		it('should not show banner when jurisdiction is NONE', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: 'NONE',
			});
			mockState.consentInfo = null;

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					activeUI: 'none',
				})
			);
		});
	});

	describe('Callback execution', () => {
		it('should call onBannerFetched callback with correct data', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const onBannerFetched = vi.fn();
			mockState.callbacks.onBannerFetched = onBannerFetched;

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(onBannerFetched).toHaveBeenCalledWith({
				jurisdiction: mockResponse.jurisdiction,
				location: mockResponse.location,
				translations: {
					language: mockResponse.translations.language,
					translations: mockResponse.translations.translations,
				},
			});
		});

		it('should update locationInfo when location data is available', async () => {
			const mockResponse = createMockConsentBannerResponse({
				location: { countryCode: 'FR', regionCode: 'IDF' },
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					locationInfo: {
						countryCode: 'FR',
						jurisdiction: mockResponse.jurisdiction ?? null,
						regionCode: 'IDF',
					},
				})
			);
		});
	});

	describe('Translation configuration', () => {
		it('should prepare translation config when translations are available', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const initialTranslationConfig = { defaultLanguage: 'es' };

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				initialTranslationConfig,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					translationConfig: expect.any(Object),
				})
			);
		});

		it('should not set translation config when translations are missing', async () => {
			const {
				translations: _translations,
				...mockResponseWithoutTranslations
			} = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponseWithoutTranslations,
				error: null,
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.not.objectContaining({
					translationConfig: expect.anything(),
				})
			);
		});
	});

	describe('Error callback handling', () => {
		it('should call onError callback when API returns error', async () => {
			const errorMessage = 'API error occurred';
			mockManager.init = vi.fn().mockResolvedValue({
				data: null,
				error: { message: errorMessage },
			});

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: `Failed to fetch consent banner info: ${errorMessage}`,
			});
		});

		it('should call onError callback when network request fails', async () => {
			const networkError = new Error('Network failed');
			mockManager.init = vi.fn().mockRejectedValue(networkError);

			await initConsentManager({
				get: storeGet,
				manager: mockManager,
				set: storeSet,
			});

			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: 'Network failed',
			});
		});

		it('should handle missing onError callback gracefully', async () => {
			mockState.callbacks.onError = undefined;
			const networkError = new Error('Network failed');
			mockManager.init = vi.fn().mockRejectedValue(networkError);

			await expect(
				initConsentManager({
					get: storeGet,
					manager: mockManager,
					set: storeSet,
				})
			).resolves.toBeUndefined();
		});
	});
});
