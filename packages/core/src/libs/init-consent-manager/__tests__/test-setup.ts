/**
 * Test utilities and mock factories for init-consent-manager tests.
 *
 * @packageDocumentation
 */

import type { InitOutput } from '@c15t/schema/types';
import { vi } from 'vitest';

import type { ConsentManagerInterface } from '../../../client/client-factory';
import type { ConsentStoreState } from '../../../store/type';
import type { ConsentType } from '../../../types';
import type { IframeBlockerConfig } from '../../iframe-blocker';

// Re-export for convenience
export type InitResponse = InitOutput;

/**
 * Mockable methods on ConsentManagerInterface
 */
type MockableConsentManagerMethods = Pick<
	ConsentManagerInterface,
	'init' | 'setConsent' | 'verifyConsent' | '$fetch'
>;

/**
 * Creates a mock consent manager for testing.
 *
 * @param overrides - Method overrides
 * @returns Mocked ConsentManagerInterface
 */
export const createMockConsentManager = function createMockConsentManager(
	overrides: Partial<MockableConsentManagerMethods> = {}
): ConsentManagerInterface {
	const base: ConsentManagerInterface = {
		$fetch: vi.fn(),
		identifyUser: vi.fn(),
		init: vi.fn(),
		setConsent: vi.fn(),
		verifyConsent: vi.fn(),
	};

	return {
		...base,
		...overrides,
	};
};

/**
 * Creates a mock store state for testing.
 *
 * @param overrides - State overrides
 * @returns Mocked ConsentStoreState
 */
export const createMockStoreState = function createMockStoreState(
	overrides: Omit<Partial<ConsentStoreState>, 'getDisplayedConsents'> = {}
): ConsentStoreState {
	return {
		activeUI: 'none' as const,
		branding: 'c15t',
		callbacks: {},
		config: { mode: 'test', pkg: 'test', version: '1.0.0' },
		consentCategories: [],
		consentInfo: null,
		consentTypes: [],
		consents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: false,
		},
		debug: false,
		destroyIframeBlocker: vi.fn(),
		destroyNetworkBlocker: vi.fn(),
		getDisplayedConsents: vi.fn(() => [] as ConsentType[]),
		getLoadedScriptIds: vi.fn().mockReturnValue([]),
		has: vi.fn(),
		hasConsented: vi.fn(),
		hasFetchedBanner: false,
		iab: null,
		identifyUser: vi.fn(),
		iframeBlockerConfig: {} as IframeBlockerConfig,
		includeNonDisplayedConsents: false,
		initConsentManager: vi.fn(),
		initDataSource: null,
		initDataSourceDetail: null,
		initializeIframeBlocker: vi.fn(),
		initializeNetworkBlocker: vi.fn(),
		isLoadingConsentInfo: false,
		isScriptLoaded: vi.fn(),
		lastBannerFetchData: null,
		legalLinks: {},
		loadedScripts: {},
		locationInfo: null,
		model: null,
		overrides: undefined,
		policyBanner: {
			allowedActions: null,
			direction: null,
			layout: null,
			primaryActions: null,
			scrollLock: null,
			uiProfile: null,
		},
		policyCategories: null,
		policyDialog: {
			allowedActions: null,
			direction: null,
			layout: null,
			primaryActions: null,
			scrollLock: null,
			uiProfile: null,
		},
		policyScopeMode: null,
		removeScript: vi.fn(),
		resetConsents: vi.fn(),
		saveConsents: vi.fn(),
		scriptIdMap: {},
		scripts: [],
		selectedConsents: {
			experience: false,
			functionality: false,
			marketing: false,
			measurement: false,
			necessary: false,
		},
		setActiveUI: vi.fn(),
		setCallback: vi.fn(),
		setConsent: vi.fn(),
		setConsentCategories: vi.fn(),
		setLanguage: vi.fn(),
		setLocationInfo: vi.fn(),
		setNetworkBlocker: vi.fn(),
		setOverrides: vi.fn(),
		setScripts: vi.fn(),
		setSelectedConsent: vi.fn(),
		setTranslationConfig: vi.fn(),
		translationConfig: {
			defaultLanguage: 'en',
			disableAutoLanguageSwitch: false,
			translations: {},
		},
		updateConsentCategories: vi.fn(),
		updateIframeConsents: vi.fn(),
		updateNetworkBlockerConsents: vi.fn(),
		updateScripts: vi.fn().mockReturnValue({ loaded: [], unloaded: [] }),
		...overrides,
	};
};

/**
 * Creates a mock consent banner response for testing.
 *
 * @param overrides - Response overrides
 * @returns Mocked InitOutput
 */
export const createMockConsentBannerResponse =
	function createMockConsentBannerResponse(
		overrides: Partial<InitResponse> = {}
	): InitResponse {
		return {
			branding: 'c15t',
			jurisdiction: 'GDPR',
			location: {
				countryCode: 'DE',
				regionCode: 'BE',
			},
			translations: {
				language: 'en',
				translations: {
					common: {
						acceptAll: 'Accept All',
						customize: 'Customize',
						rejectAll: 'Reject All',
						save: 'Save',
					},
					consentManagerDialog: {
						description: 'Manage your consent preferences',
						title: 'Consent Manager',
					},
					consentTypes: {
						experience: {
							description: 'Improves user experience',
							title: 'Experience',
						},
						functionality: {
							description: 'Enhances website functionality',
							title: 'Functionality',
						},
						marketing: {
							description: 'Used for marketing purposes',
							title: 'Marketing',
						},
						measurement: {
							description: 'Used for analytics and measurement',
							title: 'Measurement',
						},
						necessary: {
							description: 'Essential for the website to function',
							title: 'Necessary',
						},
					},
					cookieBanner: {
						description: 'We use cookies to enhance your experience',
						title: 'Cookie Banner',
					},
				},
			},
			...overrides,
		};
	};
