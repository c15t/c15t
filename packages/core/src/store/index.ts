/**
 * @packageDocumentation
 * Implements the core consent management store using Zustand.
 * This module provides the main store creation and management functionality.
 */

import { createStore } from 'zustand/vanilla';
import type { ConsentManagerInterface } from '../client/client-factory';
import type { StorageConfig } from '../libs/cookie';
import {
	deleteConsentFromStorage,
	getConsentFromStorage,
} from '../libs/cookie';
import {
	extractConsentNamesFromCondition,
	type HasCondition,
	has,
} from '../libs/has';
import { identifyUser } from '../libs/identify-user';
import { createIframeManager } from '../libs/iframe-blocker/store';
import { initConsentManager } from '../libs/init-consent-manager';
import { createNetworkBlockerManager } from '../libs/network-blocker/store';
import { saveConsents } from '../libs/save-consents';
import { createScriptManager } from '../libs/script-loader';
import { createIABManager } from '../libs/tcf/store';
import type { TranslationConfig, User } from '../types';
import type { Callbacks } from '../types/callbacks';
import type { ConsentBannerResponse, ConsentState } from '../types/compliance';
import {
	type AllConsentNames,
	type ConsentInfo,
	consentTypes,
} from '../types/gdpr';
import { initialState } from './initial-state';
import type { ConsentStoreState, StoreOptions } from './type';

/**
 * Structure of consent data stored in localStorage.
 *
 * @internal
 */
interface StoredConsent {
	/** Current consent states */
	consents: ConsentState;

	/** Metadata about when and how consent was given */
	consentInfo: ConsentInfo | null;
}

/**
 * Retrieves stored consent data from localStorage or cookie.
 *
 * @remarks
 * This function handles:
 * - Checking for browser environment
 * - Reading from localStorage (primary)
 * - Falling back to cookie if localStorage unavailable
 * - Syncing cookie if localStorage exists but cookie doesn't
 * - Error handling for invalid data
 *
 * @returns The stored consent data or null if not available
 * @internal
 */
const getStoredConsent = (config?: StorageConfig): StoredConsent | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		return getConsentFromStorage(config);
	} catch (e) {
		console.error('Failed to retrieve stored consent:', e);
		return null;
	}
};

/**
 * Creates a new consent manager store instance.
 *
 * @remarks
 * This function initializes a new consent management store with:
 * - Persistence through localStorage and cookies
 * - Initial state handling
 * - Consent management methods
 * - Privacy settings
 * - Compliance configuration
 *
 * The store is typically used through React hooks but can also be
 * accessed directly for non-React applications.
 *
 * @param manager - Consent manager client used for API calls and
 * persistence
 * @param options - Optional configuration for the store instance
 * @returns A Zustand store instance with consent management
 * functionality
 *
 * @example
 * Basic usage:
 * ```typescript
 * const store = createConsentManagerStore(manager);
 *
 * // Subscribe to state changes
 * const unsubscribe = store.subscribe(
 *   (state) => console.log('Consent updated:', state.consents),
 * );
 *
 * // Update consent
 * store.getState().setConsent('analytics', true);
 * ```
 *
 * @example
 * Custom namespace:
 * ```typescript
 * const store = createConsentManagerStore(manager, {
 *   namespace: 'MyAppConsentStore',
 * });
 *
 * // Access from window
 * const state = window.MyAppConsentStore.getState();
 * ```
 *
 * @public
 */
export const createConsentManagerStore = (
	manager: ConsentManagerInterface,
	options: StoreOptions = {}
) => {
	const {
		namespace = 'c15tStore',
		// Extract options that shouldn't be spread directly into state
		iab,
		_initialData: _unusedInitialData,
		initialGdprTypes,
		initialTranslationConfig: _unusedInitialTranslationConfig,
		enabled: _unusedEnabled,
		// The rest are valid StoreConfig properties
		...storeConfigOptions
	} = options;

	// Load initial state from localStorage if available
	const storedConsent = getStoredConsent(options.storageConfig);

	const store = createStore<ConsentStoreState>((set, get) => ({
		...initialState,
		...storeConfigOptions,
		namespace,
		// Initialize IAB manager (state + actions) if iab config is provided
		iab: iab ? createIABManager(iab, get, set, manager) : null,
		// Apply initial GDPR types if provided
		...(initialGdprTypes && { gdprTypes: initialGdprTypes }),
		...(storedConsent
			? {
					consents: storedConsent.consents,
					selectedConsents: storedConsent.consents,
					consentInfo: storedConsent.consentInfo,
					showPopup: false,
					isLoadingConsentInfo: false,
				}
			: {
					showPopup: false,
					isLoadingConsentInfo: true,
				}),
		setShowPopup: (show, force = false) => {
			// If we're hiding the popup, do it immediately without checks
			if (!show) {
				set({ showPopup: false });
				return;
			}

			// Only do validation checks when showing the popup
			const state = get();
			const storedConsent = getStoredConsent();

			// Only show popup if:
			// 1. Force is true, or
			// 2. All of these are true:
			//    - No stored consent
			//    - No current consent info
			//    - Not currently loading consent info
			if (
				force ||
				(!storedConsent && !state.consentInfo && !state.isLoadingConsentInfo)
			) {
				set({ showPopup: true });
			}
		},

		setIsPrivacyDialogOpen: (isOpen) => {
			// Use immediate state update for better UX responsiveness
			// Especially important when closing dialog
			set({ isPrivacyDialogOpen: isOpen });

			// For closing actions, trigger a microtask to ensure the UI update
			// happens immediately and is not blocked by any other operations
			if (!isOpen) {
				queueMicrotask(() => {
					// This empty microtask ensures the UI update is prioritized
				});
			}
		},

		setSelectedConsent: (name, value) => {
			set((state) => {
				const consentType = state.consentTypes.find(
					(type) => type.name === name
				);

				if (consentType?.disabled) {
					return state;
				}

				return {
					selectedConsents: { ...state.selectedConsents, [name]: value },
				};
			});
		},

		saveConsents: async (type) =>
			await saveConsents({
				manager,
				type,
				get,
				set,
			}),

		setConsent: (name, value) => {
			set((state) => {
				const consentType = state.consentTypes.find(
					(type) => type.name === name
				);

				// Don't allow changes to disabled consent types
				if (consentType?.disabled) {
					return state;
				}

				// Other selected consents have not been saved/agreed to only the current one.
				const newConsents = { ...state.consents, [name]: value };

				return { selectedConsents: newConsents };
			});

			get().saveConsents('custom');
		},
		resetConsents: () => {
			set(() => {
				const consents = consentTypes.reduce((acc, consent) => {
					acc[consent.name] = consent.defaultValue;
					return acc;
				}, {} as ConsentState);

				const resetState = {
					consents,
					selectedConsents: consents,
					consentInfo: null,
				};
				deleteConsentFromStorage(undefined, options.storageConfig);
				return resetState;
			});
		},
		setGdprTypes: (types) => set({ gdprTypes: types }),
		setCallback: (name, callback) => {
			const currentState = get();

			// Update the callback in state
			set((state) => ({
				callbacks: { ...state.callbacks, [name]: callback },
			}));

			// Call the onConsentSet callback with the initial consent state
			if (
				name === 'onConsentSet' &&
				callback &&
				typeof callback === 'function'
			) {
				(callback as Callbacks['onConsentSet'])?.({
					preferences: currentState.consents,
				});
			}

			// Replay missed onBannerFetched callback if banner was already fetched
			if (
				name === 'onBannerFetched' &&
				currentState.hasFetchedBanner &&
				currentState.lastBannerFetchData &&
				callback &&
				typeof callback === 'function'
			) {
				const { lastBannerFetchData } = currentState;

				const jurisdictionCode = lastBannerFetchData.jurisdiction ?? 'NONE';

				// Type assertion to ensure callback is the correct type
				(callback as Callbacks['onBannerFetched'])?.({
					// Derived visibility: show banner when jurisdiction is not NONE
					jurisdiction: {
						code: jurisdictionCode,
						// Message is no longer returned from the backend; leave empty
						message: '',
					},
					location: {
						countryCode: lastBannerFetchData.location.countryCode ?? null,
						regionCode: lastBannerFetchData.location.regionCode ?? null,
					},
					translations: {
						language: lastBannerFetchData.translations.language,
						translations: lastBannerFetchData.translations.translations,
					},
				});
			}
		},
		setLocationInfo: (location) => set({ locationInfo: location }),

		initConsentManager: (): Promise<ConsentBannerResponse | undefined> =>
			initConsentManager({
				manager,
				initialData: options._initialData,
				initialTranslationConfig: options.initialTranslationConfig,
				get,
				set,
			}),

		getDisplayedConsents: () => {
			const { gdprTypes, consentTypes } = get();
			return consentTypes.filter((consent) => gdprTypes.includes(consent.name));
		},

		hasConsented: () => {
			const { consentInfo } = get();
			return consentInfo != null;
		},

		has: <CategoryType extends AllConsentNames>(
			condition: HasCondition<CategoryType>
		) => {
			const { consents } = get();
			return has(condition, consents);
		},

		setTranslationConfig: (config: TranslationConfig) => {
			set({ translationConfig: config });
		},

		updateConsentCategories: (newCategories: AllConsentNames[]) => {
			const allCategoriesSet = new Set<AllConsentNames>([
				...get().gdprTypes,
				...newCategories,
			]);
			const allCategories = Array.from(allCategoriesSet);
			set({ gdprTypes: allCategories });
		},

		identifyUser: (user: User) => identifyUser({ user, manager, get, set }),

		setOverrides: async (
			overrides: ConsentStoreState['overrides']
		): Promise<ConsentBannerResponse | undefined> => {
			set({ overrides: { ...get().overrides, ...overrides } });

			return await initConsentManager({
				manager,
				initialTranslationConfig: options.initialTranslationConfig,
				get,
				set,
			});
		},

		setLanguage: async (
			language: string
		): Promise<ConsentBannerResponse | undefined> => {
			return await get().setOverrides({
				...(get().overrides ?? {}),
				language,
			});
		},

		...createScriptManager(get, set),
		...createIframeManager(get, set),
		...createNetworkBlockerManager(get, set),
	}));

	// Initialize the iframe blocker after the store is created
	store.getState().initializeIframeBlocker();

	// Initialize the network blocker after the store is created
	if (options.networkBlocker) {
		store.setState({
			networkBlocker: options.networkBlocker,
		});
		store.getState().initializeNetworkBlocker();
	}

	// Add script categories to gdprTypes
	if (options.scripts && options.scripts.length > 0) {
		store
			.getState()
			.updateConsentCategories(
				options.scripts.flatMap((script) =>
					extractConsentNamesFromCondition(script.category)
				)
			);
	}

	if (typeof window !== 'undefined') {
		// biome-ignore lint/suspicious/noExplicitAny: its okay
		(window as any)[namespace] = store;

		// When the store is initialized, call the onConsentSet callback with the initial consent state
		store
			.getState()
			.callbacks.onConsentSet?.({ preferences: store.getState().consents });

		// Identify the user if an external ID is provided
		if (options.user) {
			store.getState().identifyUser(options.user);
		}

		store.getState().initConsentManager();
	}

	return store;
};

export * from './type';
