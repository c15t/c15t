/**
 * @packageDocumentation
 * Implements the core consent management store using Zustand.
 * This module provides the main store creation and management functionality.
 */

import type { ContractsOutputs } from '@c15t/backend/contracts';

import type { TranslationConfig } from '@c15t/translations';
import { createStore } from 'zustand/vanilla';
import type { ConsentManagerInterface } from './client/client-factory';
import type { StorageConfig } from './libs/cookie';
import { deleteConsentFromStorage, getConsentFromStorage } from './libs/cookie';
import { fetchConsentBannerInfo as fetchConsentBannerInfoUtil } from './libs/fetch-consent-banner';
import {
  extractConsentNamesFromCondition,
  type HasCondition,
  has,
} from './libs/has';
import { identifyUser } from './libs/identify-user';
import type { IframeBlockerConfig } from './libs/iframe-blocker';
import { createIframeManager } from './libs/iframe-blocker/store';
import type { NetworkBlockerConfig } from './libs/network-blocker';
import { createNetworkBlockerManager } from './libs/network-blocker/store';
import { saveConsents } from './libs/save-consents';
import { createScriptManager, type Script } from './libs/script-loader';
import { initialState } from './store.initial-state';
import type { PrivacyConsentState } from './store.type';
import type { Overrides } from './types';
import type { Callbacks } from './types/callbacks';
import type { ConsentBannerResponse, ConsentState } from './types/compliance';
import {
  type AllConsentNames,
  type ConsentInfo,
  consentTypes,
} from './types/gdpr';
import type { LegalLinks } from './types/legal-links';
import type { User } from './types/user';

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
 * Configuration options for the consent manager store.
 *
 * @remarks
 * These options control the behavior of the store,
 * including initialization, tracking blocker, and persistence.
 *
 * @public
 */
export interface StoreOptions {
	/**
	 * Custom namespace for the store instance.
	 * @default 'c15tStore'
	 */
	namespace?: string;

  enabled?: boolean;

	/** Information about the consent manager */
	config?: {
		pkg: string;
		version: string;
		mode: string;
		meta?: Record<string, unknown>;
	};

	/**
	 * Initial GDPR consent types to activate.
	 */
	initialGdprTypes?: AllConsentNames[];

	/**
	 * Configuration for the iframe blocker.
	 * Controls how iframes are blocked based on consent settings.
	 */
	iframeBlockerConfig?: IframeBlockerConfig;

	/**
	 * Whether to ignore geo location. Will always show the consent banner.
	 * @default false
	 */
	ignoreGeoLocation?: boolean;

	/**
	 * Initial Translation Config
	 */
	initialTranslationConfig?: Partial<TranslationConfig>;

	/**
	 * Translation configuration for the consent manager.
	 */
	translationConfig?: TranslationConfig;

	/**
	 * If showConsentBanner is fetched prior to the store being created, you can pass the initial data here.
	 *
	 * This is useful for server-side rendering (SSR) such as in @c15t/nextjs.
	 */
	_initialData?: Promise<ContractsOutputs['consent']['showBanner'] | undefined>;

	/**
	 * Callbacks for the consent manager.
	 */
	callbacks?: Callbacks;

	/**
	 * Dynamically load scripts based on consent state.
	 * For scripts such as Google Tag Manager, Meta Pixel, etc.
	 *
	 * @see https://c15t.com/docs/frameworks/javascript/script-loader
	 */
	scripts?: Script[];

	/**
	 * Display links to various legal documents such as privacy policy, terms of service, etc across the consent manager.
	 * This can be used to display links in the consent banner, dialog, etc.
	 *
	 * @defaultValue {}
	 */
	legalLinks?: LegalLinks;

	/**
	 * Storage configuration for consent persistence.
	 *
	 * @remarks
	 * Configure how consent data is stored in localStorage and cookies.
	 *
	 * @example
	 * ```typescript
	 * const store = createConsentManagerStore(client, {
	 *   storageConfig: {
	 *     storageKey: 'my-consent',
	 *     crossSubdomain: true,
	 *     defaultExpiryDays: 180
	 *   }
	 * });
	 * ```
	 *
	 * @see {@link StorageConfig} for available options
	 */
	storageConfig?: StorageConfig;

	/**
	 * The user's information.
	 * Usually your own internal ID for the user from your auth provider
	 *
	 * @remarks
	 * This can be set later using the {@link identifyUser} method.
	 * @default undefined
	 */
	user?: User;

	/**
	 * Forcefully set values like country, region, language for the consent manager
	 * These values will override the values detected from the browser.
	 *
	 * @defaultValue undefined
	 */
	overrides?: Overrides;

	/**
	 * Configuration for the network request blocker.
	 *
	 * @remarks
	 * The network blocker intercepts global `fetch` and `XMLHttpRequest`
	 * calls and blocks requests based on the current consent state and
	 * configured domain rules.
	 *
	 * @example
	 * ```ts
	 * const store = createConsentManagerStore(client, {
	 *   networkBlocker: {
	 *     rules: [
	 *       {
	 *         id: 'ga-marketing',
	 *         domain: 'google-analytics.com',
	 *         category: 'marketing',
	 *       },
	 *     ],
	 *   },
	 * });
	 * ```
	 */
	networkBlocker?: NetworkBlockerConfig;
}

/**
 * Creates a new consent manager store instance.
 *
 * @remarks
 * This function initializes a new consent management store with:
 * - Persistence through localStorage
 * - Initial state handling
 * - Consent management methods
 * - Privacy settings
 * - Compliance configuration
 *
 * The store is typically used through React hooks but can also be
 * accessed directly for non-React applications.
 *
 * @param namespace - Optional namespace for the store instance
 * @returns A Zustand store instance with consent management functionality
 *
 * @example
 * Basic usage:
 * ```typescript
 * const store = createConsentManagerStore();
 *
 * // Subscribe to state changes
 * const unsubscribe = store.subscribe(
 *   state => console.log('Consent updated:', state.consents)
 * );
 *
 * // Update consent
 * store.getState().setConsent('analytics', true);
 * ```
 *
 * @example
 * Custom namespace:
 * ```typescript
 * const store = createConsentManagerStore(client, 'MyApp');
 *
 * // Access from window
 * const state = window.MyApp.getState();
 * ```
 *
 * @public
 */
export const createConsentManagerStore = (
	manager: ConsentManagerInterface,
	options: StoreOptions = {}
) => {
	const { namespace = 'c15tStore', translationConfig, storageConfig, enabled = true } = options;

	// Load initial state from localStorage if available
	const storedConsent = getStoredConsent(storageConfig);

  const getInitialConsentState = (): Partial<PrivacyConsentState> => {
		if (!enabled) {
			const consents = consentTypes.reduce((acc, consent) => {
				acc[consent.name] = true;
				return acc;
			}, {} as ConsentState);

			return {
				consents,
				selectedConsents: consents,
				consentInfo: {
					time: Date.now(),
					identified: !!options.user?.id,
				},
				showPopup: false,
				isLoadingConsentInfo: false,
				hasFetchedBanner: false,
				lastBannerFetchData: null,
			};
		}

		if (storedConsent) {
			return {
				consents: storedConsent.consents,
				selectedConsents: storedConsent.consents,
				consentInfo: storedConsent.consentInfo,
				showPopup: false,
				isLoadingConsentInfo: false,
			};
		}

		return {
			// Do not show popup initially - will be set after location check
			showPopup: false,
			isLoadingConsentInfo: true,
		};
	};

	const store = createStore<PrivacyConsentState>((set, get) => ({
		...initialState,
		gdprTypes: options.initialGdprTypes ?? initialState.gdprTypes,
		ignoreGeoLocation: options.ignoreGeoLocation ?? false,
		config: options.config ?? initialState.config,
		iframeBlockerConfig:
			options.iframeBlockerConfig ?? initialState.iframeBlockerConfig,
		networkBlocker: options.networkBlocker ?? initialState.networkBlocker,
		// Override the callbacks with merged callbacks
		callbacks: options.callbacks ?? initialState.callbacks,
		// Set initial scripts if provided
		scripts: options.scripts ?? initialState.scripts,

		legalLinks: options.legalLinks ?? initialState.legalLinks,
		translationConfig: translationConfig || initialState.translationConfig,
		// Set storage configuration
		storageConfig: storageConfig,
		user: options.user ?? initialState.user,
		overrides: options.overrides,
		...getInitialConsentState(),

		/**
		 * Controls the visibility of the consent popup.
		 *
		 * @param show - Whether to show the popup
		 * @param force - Whether to force showing the popup regardless of consent state
		 *
		 * @remarks
		 * The popup will only be shown if:
		 * - Forcing is enabled, or
		 * - No stored consent exists, no current consent is given, and consent information is not loading
		 *
		 * When hiding the popup (show=false), it will always hide immediately for better UX
		 */
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

		/**
		 * Controls the visibility of the privacy dialog.
		 *
		 * @param isOpen - Whether the dialog should be open
		 */
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

		/**
		 * Resets all consent preferences to their default values.
		 *
		 * @remarks
		 * This function:
		 * 1. Resets all consents to their type-specific defaults
		 * 2. Clears consent information
		 * 3. Removes stored consent from localStorage and cookie
		 */
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
				deleteConsentFromStorage(undefined, storageConfig);
				return resetState;
			});
		},

		/**
		 * Updates the active GDPR consent types.
		 *
		 * @param types - Array of consent types to activate
		 */
		setGdprTypes: (types) => set({ gdprTypes: types }),

		/**
		 * Sets a callback for a specific consent event.
		 *
		 * @param name - The callback event name
		 * @param callback - The callback function
		 *
		 * @remarks
		 * If setting the onBannerFetched callback and the banner has already been fetched,
		 * the callback will be immediately called with the stored banner data to prevent
		 * race conditions in client-side components.
		 */
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

				// Type assertion to ensure callback is the correct type
				(callback as Callbacks['onBannerFetched'])?.({
					showConsentBanner: lastBannerFetchData.showConsentBanner,
					jurisdiction: lastBannerFetchData.jurisdiction,
					location: lastBannerFetchData.location,
					translations: {
						language: lastBannerFetchData.translations.language,
						translations: lastBannerFetchData.translations.translations,
					},
				});
			}
		},

		/**
		 * Updates the user's location information.
		 *
		 * @param location - The location information
		 */
		setLocationInfo: (location) => set({ locationInfo: location }),

		/**
		 * Fetches consent banner information from the API and updates the store.
		 *
		 * @returns A promise that resolves with the consent banner response when the fetch is complete
		 */
		fetchConsentBannerInfo: (): Promise<ConsentBannerResponse | undefined> =>
			fetchConsentBannerInfoUtil({
				manager,
				initialData: options._initialData,
				initialTranslationConfig: options.initialTranslationConfig,
				get,
				set,
			}),

		/**
		 * Retrieves the list of consent types that should be displayed.
		 *
		 * @returns Array of consent types that match the active GDPR types
		 */
		getDisplayedConsents: () => {
			const { gdprTypes, consentTypes } = get();
			return consentTypes.filter((consent) => gdprTypes.includes(consent.name));
		},

		/**
		 * Evaluates whether current consent state satisfies the given condition.
		 *
		 * @param condition - The consent condition to evaluate
		 * @returns True if the consent condition is satisfied, false otherwise
		 *
		 * @remarks
		 * This method provides a powerful way to check complex consent requirements
		 * using the current consent state from the store.
		 *
		 * **Simple Usage:**
		 * - Check single consent: `store.has("measurement")`
		 *
		 * **Complex Conditions:**
		 * - AND logic: `store.has({ and: ["measurement", "marketing"] })`
		 * - OR logic: `store.has({ or: ["measurement", "marketing"] })`
		 * - NOT logic: `store.has({ not: "measurement" })`
		 * - Nested logic: `store.has({ and: ["necessary", { or: ["measurement", "marketing"] }] })`
		 *
		 * @example
		 * ```typescript
		 * // Simple checks
		 * const hasAnalytics = store.has("measurement");
		 * const hasMarketing = store.has("marketing");
		 *
		 * // Complex logic
		 * const hasAnalyticsAndMarketing = store.has({ and: ["measurement", "marketing"] });
		 * const hasEitherAnalyticsOrMarketing = store.has({ or: ["measurement", "marketing"] });
		 * const doesNotHaveMarketing = store.has({ not: "marketing" });
		 *
		 * // Complex nested conditions
		 * const complexCondition = store.has({
		 *   and: [
		 *     "necessary",
		 *     { or: ["measurement", "marketing"] },
		 *     { not: "functionality" }
		 *   ]
		 * });
		 * ```
		 *
		 * @see {@link has} for the underlying consent checking function
		 */
		has: <CategoryType extends AllConsentNames>(
			condition: HasCondition<CategoryType>
		) => {
			const { consents } = get();
			return has(condition, consents);
		},

		/**
		 * Updates the translation configuration.
		 * @param config - The new translation configuration
		 */
		setTranslationConfig: (config: TranslationConfig) => {
			set({ translationConfig: config });
		},

		updateConsentCategories: (newCategories: AllConsentNames[]) => {
			const allCategories = [
				...new Set([...get().gdprTypes, ...newCategories]),
			];
			set({ gdprTypes: allCategories });
		},

		identifyUser: (user: User) => identifyUser({ user, manager, get, set }),

		setOverrides: (overrides: PrivacyConsentState['overrides']) =>
			set({ overrides: { ...get().overrides, ...overrides } }),

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

		// Update based on the initial consent state
		store.getState().updateScripts();
    store.getState().updateNetworkBlockerConsents();
		store.getState().fetchConsentBannerInfo();
	}

	return store;
};
