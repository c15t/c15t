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
import { hasGlobalPrivacyControlSignal } from '../../global-privacy-control';
import { initConsentManager } from '../index';
import {
	createMockConsentBannerResponse,
	createMockConsentManager,
	createMockStoreState,
} from './test-setup';

vi.mock('../../global-privacy-control', () => ({
	hasGlobalPrivacyControlSignal: vi.fn(),
}));

describe('initConsentManager', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let storeGet: StoreApi<ConsentStoreState>['getState'];
	let storeSet: StoreApi<ConsentStoreState>['setState'];
	let mockManager: ConsentManagerInterface;
	let mockState: ConsentStoreState;

	beforeEach(() => {
		vi.clearAllMocks();

		mockGet = vi.fn();
		mockSet = vi.fn();
		storeGet = mockGet as unknown as StoreApi<ConsentStoreState>['getState'];
		storeSet = mockSet as unknown as StoreApi<ConsentStoreState>['setState'];

		mockState = createMockStoreState({
			hasConsented: vi.fn().mockReturnValue(false),
			callbacks: {
				onBannerFetched: vi.fn(),
				onError: vi.fn(),
			},
		});

		mockGet.mockReturnValue(mockState);
		mockManager = createMockConsentManager();
	});

	describe('Environment checks', () => {
		it('should return undefined when window is undefined (SSR)', async () => {
			const originalWindow = globalThis.window;
			try {
				// biome-ignore lint/suspicious/noExplicitAny: Testing environment setup
				(globalThis as any).window = undefined;

				const result = await initConsentManager({
					manager: mockManager,
					get: storeGet,
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
			// biome-ignore lint/suspicious/noExplicitAny: Testing localStorage access
			(window as any).localStorage = {
				setItem: vi.fn().mockImplementation(() => {
					throw new Error('localStorage not available');
				}),
				removeItem: vi.fn(),
			};

			const result = await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({
				isLoadingConsentInfo: false,
				showPopup: false,
			});

			window.localStorage = originalLocalStorage;
		});
	});

	describe('Initial data handling', () => {
		it('should use initial data when provided and valid', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const initialData = Promise.resolve({
				init: mockResponse,
				gvl: undefined,
			});

			const result = await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).not.toHaveBeenCalled();
		});

		it('should fall back to API call when initial data is undefined', async () => {
			const initialData = Promise.resolve(undefined);
			const mockResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			const result = await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).toHaveBeenCalled();
		});

		it('should fall back to API call when initial data init is undefined', async () => {
			const initialData = Promise.resolve({
				init: undefined,
				gvl: undefined,
			});
			const mockResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			const result = await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.init).toHaveBeenCalled();
		});

		it('should skip initial data when overrides are present', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const initialData = Promise.resolve({
				init: mockResponse,
				gvl: undefined,
			});

			mockState.overrides = {
				country: 'DE',
				region: 'BE',
				language: 'de',
			};

			const apiResponse = createMockConsentBannerResponse({
				location: { countryCode: 'DE', regionCode: 'BE' },
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: apiResponse,
				error: null,
			});

			const result = await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialData,
			});

			expect(result).toEqual(apiResponse);
			expect(mockManager.init).toHaveBeenCalled();
		});

		it('should pass overrides as headers to init', async () => {
			mockState.overrides = {
				country: 'FR',
				region: 'IDF',
				language: 'fr',
			};

			const mockResponse = createMockConsentBannerResponse({
				location: { countryCode: 'FR', regionCode: 'IDF' },
			});

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockManager.init).toHaveBeenCalledWith({
				headers: {
					'x-c15t-country': 'FR',
					'x-c15t-region': 'IDF',
					'accept-language': 'fr',
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
				manager: mockManager,
				get: storeGet,
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
				manager: mockManager,
				get: storeGet,
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
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({
				isLoadingConsentInfo: false,
				showPopup: false,
			});
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: `Failed to fetch consent banner info: ${errorMessage}`,
			});
		});

		it('should handle network errors and exceptions', async () => {
			const networkError = new Error('Network error');
			mockManager.init = vi.fn().mockRejectedValue(networkError);

			const result = await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({
				isLoadingConsentInfo: false,
				showPopup: false,
			});
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: 'Network error',
			});
		});

		it('should handle unknown errors with fallback message', async () => {
			const unknownError = 'Unknown error';
			mockManager.init = vi.fn().mockRejectedValue(unknownError);

			const result = await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: 'Unknown error fetching consent banner information',
			});
		});
	});

	describe('Store updates', () => {
		it('should update store with consent banner data', async () => {
			const mockResponse = createMockConsentBannerResponse();

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					isLoadingConsentInfo: false,
					hasFetchedBanner: true,
					lastBannerFetchData: mockResponse,
					locationInfo: {
						countryCode: 'DE',
						regionCode: 'BE',
						jurisdiction: mockResponse.jurisdiction ?? null,
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
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: true,
						experience: true,
						marketing: true,
						measurement: true,
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

			vi.mocked(hasGlobalPrivacyControlSignal).mockReturnValue(true);

			await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: true,
						experience: true,
						marketing: false,
						measurement: false,
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
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.not.objectContaining({
					consents: expect.anything(),
				})
			);
		});

		it('should show popup when consent info is null and jurisdiction is regulated', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: 'GDPR',
			});
			mockState.consentInfo = null;

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					showPopup: true,
				})
			);
		});

		it('should not show popup when jurisdiction is NONE', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: 'NONE',
			});
			mockState.consentInfo = null;

			mockManager.init = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await initConsentManager({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					showPopup: false,
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
				manager: mockManager,
				get: storeGet,
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
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					locationInfo: {
						countryCode: 'FR',
						regionCode: 'IDF',
						jurisdiction: mockResponse.jurisdiction ?? null,
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
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialTranslationConfig,
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
				manager: mockManager,
				get: storeGet,
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
				manager: mockManager,
				get: storeGet,
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
				manager: mockManager,
				get: storeGet,
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
					manager: mockManager,
					get: storeGet,
					set: storeSet,
				})
			).resolves.toBeUndefined();
		});
	});
});
