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
export function createMockConsentManager(
	overrides: Partial<MockableConsentManagerMethods> = {}
): ConsentManagerInterface {
	const base: ConsentManagerInterface = {
		init: vi.fn(),
		setConsent: vi.fn(),
		verifyConsent: vi.fn(),
		identifyUser: vi.fn(),
		$fetch: vi.fn(),
	};

	return {
		...base,
		...overrides,
	};
}

/**
 * Creates a mock store state for testing.
 *
 * @param overrides - State overrides
 * @returns Mocked ConsentStoreState
 */
export function createMockStoreState(
	overrides: Omit<Partial<ConsentStoreState>, 'getDisplayedConsents'> = {}
): ConsentStoreState {
	return {
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
		model: null,
		locationInfo: null,
		translationConfig: {
			translations: {},
			defaultLanguage: 'en',
			disableAutoLanguageSwitch: false,
		},
		setTranslationConfig: vi.fn(),
		setLanguage: vi.fn(),
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
		initConsentManager: vi.fn(),
		getDisplayedConsents: vi.fn(() => [] as ConsentType[]),
		hasConsented: vi.fn(),
		setSelectedConsent: vi.fn(),
		has: vi.fn(),
		overrides: undefined,
		setOverrides: vi.fn(),
		iab: null,
		...overrides,
	};
}

/**
 * Creates a mock consent banner response for testing.
 *
 * @param overrides - Response overrides
 * @returns Mocked InitOutput
 */
export function createMockConsentBannerResponse(
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
	};
}
