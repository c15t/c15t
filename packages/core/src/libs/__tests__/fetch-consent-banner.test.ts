import type { ContractsOutputs } from '@c15t/backend/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../../client/client-factory';
import type { IframeBlockerConfig } from '../../libs/iframe-blocker';
import type { ConsentStoreState } from '../../store/type';
import { fetchConsentBannerInfo } from '../fetch-consent-banner';
import { hasGlobalPrivacyControlSignal } from '../global-privacy-control';

vi.mock('../global-privacy-control', () => ({
	hasGlobalPrivacyControlSignal: vi.fn(),
}));

// Mock types for testing
type ConsentBannerResponse = ContractsOutputs['consent']['showBanner'];

/**
 * Mock consent manager for testing
 */
type MockableConsentManagerMethods = Pick<
	ConsentManagerInterface,
	'showConsentBanner' | 'setConsent' | 'verifyConsent' | '$fetch'
>;

const createMockConsentManager = (
	overrides: Partial<MockableConsentManagerMethods> = {}
): ConsentManagerInterface => {
	const base: ConsentManagerInterface = {
		showConsentBanner: vi.fn(),
		setConsent: vi.fn(),
		verifyConsent: vi.fn(),
		identifyUser: vi.fn(),
		$fetch: vi.fn(),
	};

	return {
		...base,
		...overrides,
	};
};

/**
 * Mock store state for testing
 */
const createMockStoreState = (
	overrides: Partial<ConsentStoreState> = {}
): ConsentStoreState => ({
	config: { pkg: 'test', version: '1.0.0', mode: 'test' },
	legalLinks: {},
	branding: 'c15t',
	consents: {
		necessary: false,
		functionality: false,
		experience: false,
		marketing: false,
		measurement: false,
	},
	selectedConsents: {
		necessary: false,
		functionality: false,
		experience: false,
		marketing: false,
		measurement: false,
	},
	consentInfo: null,
	showPopup: false,
	isLoadingConsentInfo: false,
	hasFetchedBanner: false,
	lastBannerFetchData: null,
	gdprTypes: [],
	isPrivacyDialogOpen: false,
	iframeBlockerConfig: {} as IframeBlockerConfig,
	callbacks: {},
	locationInfo: null,
	translationConfig: {
		translations: {},
		defaultLanguage: 'en',
		disableAutoLanguageSwitch: false,
	},
	ignoreGeoLocation: false,
	setTranslationConfig: vi.fn(),
	includeNonDisplayedConsents: false,
	consentTypes: [],
	scripts: [],
	loadedScripts: {},
	scriptIdMap: {},
	setScripts: vi.fn(),
	removeScript: vi.fn(),
	updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
	isScriptLoaded: vi.fn(),
	getLoadedScriptIds: vi.fn().mockReturnValue([]),
	setConsent: vi.fn(),
	setShowPopup: vi.fn(),
	setIsPrivacyDialogOpen: vi.fn(),
	saveConsents: vi.fn(),
	resetConsents: vi.fn(),
	initializeIframeBlocker: vi.fn(),
	updateIframeConsents: vi.fn(),
	destroyIframeBlocker: vi.fn(),
	initializeNetworkBlocker: vi.fn(),
	updateNetworkBlockerConsents: vi.fn(),
	setNetworkBlocker: vi.fn(),
	destroyNetworkBlocker: vi.fn(),
	updateConsentCategories: vi.fn(),
	identifyUser: vi.fn(),
	setGdprTypes: vi.fn(),
	setCallback: vi.fn(),
	setLocationInfo: vi.fn(),
	fetchConsentBannerInfo: vi.fn(),
	getDisplayedConsents: vi.fn(),
	hasConsented: vi.fn(),
	setSelectedConsent: vi.fn(),
	has: vi.fn(),
	overrides: undefined,
	setOverrides: vi.fn(),
	identifyUser: vi.fn(),
	initializeIframeBlocker: vi.fn(),
	updateIframeConsents: vi.fn(),
	destroyIframeBlocker: vi.fn(),
	updateConsentCategories: vi.fn(),
	...overrides,
});

/**
 * Sample consent banner response for testing
 */
const createMockConsentBannerResponse = (
	overrides: Partial<ConsentBannerResponse> = {}
): ConsentBannerResponse => ({
	showConsentBanner: true,
	branding: 'c15t',
	jurisdiction: {
		code: 'GDPR',
		message: 'EU General Data Protection Regulation',
	},
	location: {
		countryCode: 'DE',
		regionCode: 'BE',
	},
	translations: {
		language: 'en',
		translations: {
			common: {
				acceptAll: 'Accept All',
				rejectAll: 'Reject All',
				customize: 'Customize',
				save: 'Save',
			},
			cookieBanner: {
				title: 'Cookie Banner',
				description: 'We use cookies to enhance your experience',
			},
			consentManagerDialog: {
				title: 'Consent Manager',
				description: 'Manage your consent preferences',
			},
			consentTypes: {
				necessary: {
					title: 'Necessary',
					description: 'Essential for the website to function',
				},
				functionality: {
					title: 'Functionality',
					description: 'Enhances website functionality',
				},
				experience: {
					title: 'Experience',
					description: 'Improves user experience',
				},
				marketing: {
					title: 'Marketing',
					description: 'Used for marketing purposes',
				},
				measurement: {
					title: 'Measurement',
					description: 'Used for analytics and measurement',
				},
			},
		},
	},
	...overrides,
});

describe('fetchConsentBannerInfo', () => {
	let mockGet: ReturnType<typeof vi.fn>;
	let mockSet: ReturnType<typeof vi.fn>;
	let storeGet: StoreApi<ConsentStoreState>['getState'];
	let storeSet: StoreApi<ConsentStoreState>['setState'];
	let mockManager: ConsentManagerInterface;
	let mockState: ConsentStoreState;

	beforeEach(() => {
		// Reset all mocks
		vi.clearAllMocks();

		// Create mock store functions
		mockGet = vi.fn();
		mockSet = vi.fn();
		storeGet = mockGet as unknown as StoreApi<ConsentStoreState>['getState'];
		storeSet = mockSet as unknown as StoreApi<ConsentStoreState>['setState'];

		// Create mock state
		mockState = createMockStoreState({
			hasConsented: vi.fn().mockReturnValue(false),
			callbacks: {
				onBannerFetched: vi.fn(),
				onError: vi.fn(),
			},
		});

		// Setup mock get to return our state
		mockGet.mockReturnValue(mockState);

		// Create mock manager
		mockManager = createMockConsentManager();
	});

	describe('Environment checks', () => {
		it('should return undefined when window is undefined (SSR)', async () => {
			// Mock window as undefined
			const originalWindow = globalThis.window;
			// biome-ignore lint/suspicious/noExplicitAny: Testing environment setup
			(globalThis as any).window = undefined;

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			// SSR path doesn't set isLoadingConsentInfo: false in the current implementation
			expect(mockSet).not.toHaveBeenCalled();

			// Restore window
			globalThis.window = originalWindow;
		});

		it('should return undefined when localStorage is not accessible', async () => {
			// Mock localStorage to throw an error
			const originalLocalStorage = window.localStorage;
			// biome-ignore lint/suspicious/noExplicitAny: Testing localStorage access
			(window as any).localStorage = {
				setItem: vi.fn().mockImplementation(() => {
					throw new Error('localStorage not available');
				}),
				removeItem: vi.fn(),
			};

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({
				isLoadingConsentInfo: false,
				showPopup: false,
			});

			// Restore localStorage
			window.localStorage = originalLocalStorage;
		});
	});

	describe('Initial data handling', () => {
		it('should use initial data when provided and valid', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const initialData = Promise.resolve(mockResponse);

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialData,
			});

			expect(result).toEqual(mockResponse);
			// No longer directly setting isLoadingConsentInfo: false since it's handled in updateStore
			expect(mockManager.showConsentBanner).not.toHaveBeenCalled();
		});

		it('should fall back to API call when initial data is undefined', async () => {
			const initialData = Promise.resolve(undefined);
			const mockResponse = createMockConsentBannerResponse();

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialData,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.showConsentBanner).toHaveBeenCalled();
		});

		it('should skip initial data when overrides are present', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const initialData = Promise.resolve(mockResponse);

			mockState.overrides = {
				country: 'DE',
				region: 'BE',
				language: 'de',
			};

			const apiResponse = createMockConsentBannerResponse({
				location: { countryCode: 'DE', regionCode: 'BE' },
			});

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: apiResponse,
				error: null,
			});

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
				initialData,
			});

			// Should use API response, not initial data
			expect(result).toEqual(apiResponse);
			expect(mockManager.showConsentBanner).toHaveBeenCalled();
		});

		it('should pass overrides as headers to showConsentBanner', async () => {
			mockState.overrides = {
				country: 'FR',
				region: 'IDF',
				language: 'fr',
			};

			const mockResponse = createMockConsentBannerResponse({
				location: { countryCode: 'FR', regionCode: 'IDF' },
			});

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockManager.showConsentBanner).toHaveBeenCalledWith({
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
				// region and language are undefined
			};

			const mockResponse = createMockConsentBannerResponse({
				location: { countryCode: 'CA', regionCode: null },
			});

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockManager.showConsentBanner).toHaveBeenCalledWith({
				headers: {
					'x-c15t-country': 'CA',
				},
				onError: expect.any(Function),
			});
		});

		// it('should handle rejected initial data promise', async () => {
		// 	// Mock console.error to prevent test output noise
		// 	const originalConsoleError = console.error;
		// 	console.error = vi.fn();

		// 	// Create a rejected promise
		// 	const initialData = Promise.reject(new Error('Initial data failed'));

		// 	// Use vitest's async matcher
		// 	await expect(
		// 		fetchConsentBannerInfo({
		// 			manager: mockManager,
		// 			get: mockGet,
		// 			set: mockSet,
		// 			initialData,
		// 		})
		// 	).rejects.toThrow('Initial data failed');

		// 	// Restore console.error
		// 	console.error = originalConsoleError;
		// });
	});

	describe('API call handling', () => {
		it('should successfully fetch and process consent banner data', async () => {
			const mockResponse = createMockConsentBannerResponse();

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toEqual(mockResponse);
			expect(mockManager.showConsentBanner).toHaveBeenCalledWith({
				headers: {},
				onError: expect.any(Function),
			});
			expect(mockSet).toHaveBeenCalledWith({ isLoadingConsentInfo: true });
		});

		it('should handle API errors gracefully', async () => {
			const errorMessage = 'API request failed';
			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: null,
				error: { message: errorMessage },
			});

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({ isLoadingConsentInfo: false });
			expect(mockSet).toHaveBeenCalledWith({ showPopup: false });
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: `Failed to fetch consent banner info: ${errorMessage}`,
			});
		});

		it('should handle network errors and exceptions', async () => {
			const networkError = new Error('Network error');
			mockManager.showConsentBanner = vi.fn().mockRejectedValue(networkError);

			const result = await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(result).toBeUndefined();
			expect(mockSet).toHaveBeenCalledWith({ isLoadingConsentInfo: false });
			expect(mockSet).toHaveBeenCalledWith({ showPopup: false });
			expect(mockState.callbacks.onError).toHaveBeenCalledWith({
				error: 'Network error',
			});
		});

		it('should handle unknown errors with fallback message', async () => {
			const unknownError = 'Unknown error';
			mockManager.showConsentBanner = vi.fn().mockRejectedValue(unknownError);

			const result = await fetchConsentBannerInfo({
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

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
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
						jurisdiction: mockResponse.jurisdiction?.code ?? null,
						jurisdictionMessage: mockResponse.jurisdiction?.message ?? null,
					},
					translationConfig: expect.any(Object),
				})
			);
		});

		it('should handle jurisdiction with NONE code correctly', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: { code: 'NONE', message: 'No requirements' },
				showConsentBanner: false,
			});

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			// Verify that set was called with consents set to true when jurisdiction.code is 'NONE'
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

		it('should not auto grant consents if the user has already consented', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: { code: 'NONE', message: 'No requirements' },
				showConsentBanner: false,
			});

			mockState.consentInfo = { time: Date.now(), type: 'all' };

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: mockGet,
				set: mockSet,
			});

			// Verify that set was NOT called with consents
			expect(mockSet).toHaveBeenCalledWith(
				expect.not.objectContaining({
					consents: expect.anything(),
				})
			);
		});

		it('should honor Global Privacy Control when auto granting consents', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: { code: 'NONE', message: 'No requirements' },
				showConsentBanner: false,
			});

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			vi.mocked(hasGlobalPrivacyControlSignal).mockReturnValue(true);

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			const lastCall =
				mockSet.mock.calls[mockSet.mock.calls.length - 1]?.[0] ?? {};

			expect(lastCall).toEqual(
				expect.objectContaining({
					consents: {
						necessary: true,
						functionality: false,
						experience: false,
						marketing: false,
						measurement: false,
					},
				})
			);
		});

		it('should not auto grant consents when user already has consent info', async () => {
			const mockResponse = createMockConsentBannerResponse({
				jurisdiction: { code: 'NONE', message: 'No requirements' },
				showConsentBanner: false,
			});

			mockState.consentInfo = { time: Date.now() };

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			const lastCall =
				mockSet.mock.calls[mockSet.mock.calls.length - 1]?.[0] ?? {};

			expect(lastCall).not.toHaveProperty('consents');
		});

		it('should not show popup when consent info already exists', async () => {
			const mockResponse = createMockConsentBannerResponse();
			mockState.consentInfo = { time: Date.now() };

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.not.objectContaining({
					showPopup: expect.anything(),
				})
			);
		});

		it('should show popup when consent info is null and banner should be shown', async () => {
			const mockResponse = createMockConsentBannerResponse({
				showConsentBanner: true,
			});
			mockState.consentInfo = null;

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
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

		it('should not show popup when banner should not be shown', async () => {
			const mockResponse = createMockConsentBannerResponse({
				showConsentBanner: false,
			});
			mockState.consentInfo = null;

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
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

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(onBannerFetched).toHaveBeenCalledWith({
				showConsentBanner: mockResponse.showConsentBanner,
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

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					locationInfo: {
						countryCode: 'FR',
						regionCode: 'IDF',
						jurisdiction: mockResponse.jurisdiction?.code ?? null,
						jurisdictionMessage: mockResponse.jurisdiction?.message ?? null,
					},
				})
			);
		});

		it('should set null country and region in locationInfo when location data is missing', async () => {
			const mockResponse = createMockConsentBannerResponse({
				location: { countryCode: null, regionCode: null },
			});

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
				manager: mockManager,
				get: storeGet,
				set: storeSet,
			});

			expect(mockSet).toHaveBeenCalledWith(
				expect.objectContaining({
					locationInfo: {
						countryCode: null,
						regionCode: null,
						jurisdiction: mockResponse.jurisdiction?.code ?? null,
						jurisdictionMessage: mockResponse.jurisdiction?.message ?? null,
					},
				})
			);
		});
	});

	describe('Translation configuration', () => {
		it('should prepare translation config when translations are available', async () => {
			const mockResponse = createMockConsentBannerResponse();
			const initialTranslationConfig = { defaultLanguage: 'es' };

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
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
			// Create a response without translations field
			const {
				translations: _translations,
				...mockResponseWithoutTranslations
			} = createMockConsentBannerResponse();

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponseWithoutTranslations,
				error: null,
			});

			await fetchConsentBannerInfo({
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
			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: null,
				error: { message: errorMessage },
			});

			await fetchConsentBannerInfo({
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
			mockManager.showConsentBanner = vi.fn().mockRejectedValue(networkError);

			await fetchConsentBannerInfo({
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
			mockManager.showConsentBanner = vi.fn().mockRejectedValue(networkError);

			// Should not throw
			await expect(
				fetchConsentBannerInfo({
					manager: mockManager,
					get: storeGet,
					set: storeSet,
				})
			).resolves.toBeUndefined();
		});
	});

	describe('Ignore geo location handling', () => {
		it('should show popup when ignoreGeoLocation is true', async () => {
			mockState.ignoreGeoLocation = true;
			mockState.consentInfo = null;

			const mockResponse = createMockConsentBannerResponse({
				showConsentBanner: false,
			});

			mockManager.showConsentBanner = vi.fn().mockResolvedValue({
				data: mockResponse,
				error: null,
			});

			await fetchConsentBannerInfo({
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
	});
});
