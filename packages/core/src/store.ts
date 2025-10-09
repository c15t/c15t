/**
 * @packageDocumentation
 * Implements the core consent management store using Zustand.
 * This module provides the main store creation and management functionality.
 */

import type { ContractsOutputs } from '@c15t/backend/contracts';

import type { TranslationConfig } from '@c15t/translations';
import { createStore } from 'zustand/vanilla';
import type { ConsentManagerInterface } from './client/client-factory';
import {
	getEffectiveConsents,
	hasConsented,
	hasConsentFor,
} from './libs/consent-utils';
import { fetchConsentBannerInfo as fetchConsentBannerInfoUtil } from './libs/fetch-consent-banner';
import { type GTMConfiguration, setupGTM } from './libs/gtm';
import {
	extractConsentNamesFromCondition,
	type HasCondition,
	has,
} from './libs/has';
import type { IframeBlockerConfig } from './libs/iframe-blocker';
import { createIframeManager } from './libs/iframe-blocker/store';
import { saveConsents } from './libs/save-consents';
import { createScriptManager, type Script } from './libs/script-loader';
import type { TrackingBlockerConfig } from './libs/tracking-blocker';
import { createTrackingBlocker } from './libs/tracking-blocker';
import { initialState, STORAGE_KEY } from './store.initial-state';
import type { PrivacyConsentState } from './store.type';
import type { Callbacks } from './types/callbacks';
import type {
	ComplianceSettings,
	ConsentBannerResponse,
	ConsentState,
} from './types/compliance';
import { type AllConsentNames, consentTypes } from './types/gdpr';

/**
 * Structure of consent data stored in localStorage.
 *
 * @internal
 */
interface StoredConsent {
	/** Current consent states */
	consents: ConsentState;

	/** Metadata about when and how consent was given */
	consentInfo: {
		time: number;
		type: string;
	} | null;
}

/**
 * Retrieves stored consent data from localStorage.
 *
 * @remarks
 * This function handles:
 * - Checking for browser environment
 * - Parsing stored JSON data
 * - Error handling for invalid data
 *
 * @returns The stored consent data or null if not available
 * @internal
 */
const getStoredConsent = (): StoredConsent | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) {
		return null;
	}

	try {
		return JSON.parse(stored);
	} catch (e) {
		console.error('Failed to parse stored consent:', e);
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
	 * Initial compliance settings for different regions.
	 * @deprecated will be removed in v2.0 due to unused functionality
	 */
	initialComplianceSettings?: Record<string, Partial<ComplianceSettings>>;

	/**
	 * Configuration options for the tracking blocker system.
	 *
	 * @remarks
	 * **Important:** The tracking blocker is automatically disabled when using the Script Loader
	 * to prevent conflicts between the two systems. If you provide `scripts` in the store options,
	 * or if you dynamically add scripts using `setScripts()`, the tracking blocker will be
	 * destroyed to ensure proper script loading behavior.
	 *
	 * This interface controls how the tracking blocker intercepts and manages
	 * network requests based on user consent. The blocker overrides global
	 * `fetch` and `XMLHttpRequest` APIs to enforce consent requirements.
	 *
	 * @deprecated This interface is deprecated and will be removed in v2.0.
	 * The default domain map will be empty in v2.0, requiring users to explicitly
	 * specify domains to block. Use the new Script Loader
	 * instead for more granular control over script loading based on consent.
	 *
	 * @see https://c15t.com/docs/frameworks/javascript/script-loader
	 */
	trackingBlockerConfig?: TrackingBlockerConfig;

	/**
	 * Configuration for the iframe blocker.
	 * Controls how iframes are blocked based on consent settings.
	 */
	iframeBlockerConfig?: IframeBlockerConfig;

	/**
	 * Flag indicating if the consent manager is using the c15t.dev domain.
	 * @default false
	 * @deprecated will be removed in a future version
	 */
	isConsentDomain?: boolean;

	/**
	 * Google Tag Manager configuration.
	 * @deprecated use {@link https://c15t.com/docs/integrations/google-tag-manager} instead
	 */
	unstable_googleTagManager?: GTMConfiguration;

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
}

// For backward compatibility (if needed)
export interface StoreConfig
	extends Pick<StoreOptions, 'trackingBlockerConfig'> {}

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
	const {
		namespace = 'c15tStore',
		trackingBlockerConfig,
		isConsentDomain = false,
		translationConfig,
	} = options;

	// Load initial state from localStorage if available
	const storedConsent = getStoredConsent();

	// Automatically disable tracking blocker if script loader is in use
	const shouldDisableTrackingBlocker =
		options.scripts && options.scripts.length > 0;

	// Initialize tracking blocker only if not using script loader
	const trackingBlocker =
		typeof window !== 'undefined' && !shouldDisableTrackingBlocker
			? createTrackingBlocker(
					trackingBlockerConfig || {},
					storedConsent?.consents || initialState.consents
				)
			: null;

	const store = createStore<PrivacyConsentState>((set, get) => ({
		...initialState,
		gdprTypes: options.initialGdprTypes ?? initialState.gdprTypes,
		ignoreGeoLocation: options.ignoreGeoLocation ?? false,
		config: options.config ?? initialState.config,
		iframeBlockerConfig:
			options.iframeBlockerConfig ?? initialState.iframeBlockerConfig,
		// Set isConsentDomain based on the provider's baseURL
		isConsentDomain,
		// Override the callbacks with merged callbacks
		callbacks: options.callbacks ?? initialState.callbacks,
		// Set initial scripts if provided
		scripts: options.scripts ?? initialState.scripts,
		// Set initial translation config if provided
		translationConfig: translationConfig || initialState.translationConfig,
		...(storedConsent
			? {
					consents: storedConsent.consents,
					selectedConsents: storedConsent.consents,
					consentInfo: storedConsent.consentInfo as {
						time: number;
						type: 'necessary' | 'all' | 'custom';
					} | null,
					showPopup: false, // Don't show popup if we have stored consent
					isLoadingConsentInfo: false, // Not loading if we have stored consent
				}
			: {
					// Don't show popup initially - we'll set it after location check
					showPopup: false,
					isLoadingConsentInfo: true, // Start in loading state
				}),

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
				trackingBlocker,
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
		 * 3. Removes stored consent from localStorage
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
				localStorage.removeItem(STORAGE_KEY);
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
		 * Updates compliance settings for a specific region.
		 *
		 * @param region - The region to update
		 * @param settings - New compliance settings
		 *
		 * @remarks
		 * Merges new settings with existing ones for the specified region
		 */
		setComplianceSetting: (region, settings) =>
			set((state) => ({
				complianceSettings: {
					...state.complianceSettings,
					[region]: { ...state.complianceSettings[region], ...settings },
				},
			})),

		/**
		 * Resets compliance settings to their default values.
		 */
		resetComplianceSettings: () =>
			set({
				complianceSettings: initialState.complianceSettings,
			}),

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
		 * Updates the user's detected country.
		 *
		 * @param country - The country code
		 */
		setDetectedCountry: (country) => set({ detectedCountry: country }),

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
				trackingBlocker,
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
		 * Checks if the user has provided any form of consent.
		 *
		 * @returns True if any consent has been given
		 */
		hasConsented: () => {
			const { consentInfo } = get();
			return hasConsented(consentInfo);
		},

		/**
		 * Gets the effective consent states after applying privacy settings.
		 * @deprecated will be removed in a future version
		 * @returns The effective consent states considering Do Not Track
		 */
		getEffectiveConsents: () => {
			const { consents, privacySettings } = get();
			return getEffectiveConsents(consents, privacySettings.honorDoNotTrack);
		},

		/**
		 * Checks if consent has been given for a specific type.
		 * @deprecated will be removed in a future version
		 * @param consentType - The consent type to check
		 * @returns True if consent is granted for the specified type
		 */
		hasConsentFor: (consentType) => {
			const { consents, privacySettings } = get();
			return hasConsentFor(
				consentType,
				consents,
				privacySettings.honorDoNotTrack
			);
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

		...createScriptManager(get, set, trackingBlocker),
		...createIframeManager(get, set),
	}));

	// Initialize the iframe blocker after the store is created
	store.getState().initializeIframeBlocker();

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

		if (options.unstable_googleTagManager) {
			try {
				setupGTM({
					...options.unstable_googleTagManager,
					consentState: store.getState().consents,
				});
			} catch (e) {
				console.error('Failed to setup Google Tag Manager:', e);
			}
		}

		store.getState().fetchConsentBannerInfo();
	}

	return store;
};
