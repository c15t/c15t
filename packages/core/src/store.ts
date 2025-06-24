/**
 * @packageDocumentation
 * Implements the core consent management store using Zustand.
 * This module provides the main store creation and management functionality.
 */

import { createStore } from 'zustand/vanilla';

import type { TranslationConfig } from '@c15t/translations';
import type { ConsentManagerInterface } from './client/client-factory';
import {
	getEffectiveConsents,
	hasConsentFor,
	hasConsented,
} from './libs/consent-utils';
import { fetchConsentBannerInfo as fetchConsentBannerInfoUtil } from './libs/fetch-consent-banner';
import { createTrackingBlocker } from './libs/tracking-blocker';
import type { TrackingBlockerConfig } from './libs/tracking-blocker';
import { initialState } from './store.initial-state';
import type { PrivacyConsentState } from './store.type';
import type {
	ComplianceSettings,
	ConsentBannerResponse,
	ConsentState,
} from './types/compliance';
import { type AllConsentNames, consentTypes } from './types/gdpr';

import type { ContractsOutputs } from '@c15t/backend/contracts';
import { type GTMConfiguration, setupGTM, updateGTMConsent } from './libs/gtm';

/** Storage key for persisting consent data in localStorage */
const STORAGE_KEY = 'privacy-consent-storage';

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
		// biome-ignore lint/suspicious/noConsole: <explanation>
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
	};

	/**
	 * Initial GDPR consent types to activate.
	 */
	initialGdprTypes?: AllConsentNames[];

	/**
	 * Initial compliance settings for different regions.
	 */
	initialComplianceSettings?: Record<string, Partial<ComplianceSettings>>;

	/**
	 * Configuration for the tracking blocker.
	 */
	trackingBlockerConfig?: TrackingBlockerConfig;

	/**
	 * Flag indicating if the consent manager is using the c15t.dev domain.
	 * @default false
	 */
	isConsentDomain?: boolean;

	/**
	 * Google Tag Manager configuration.
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
	 * Initial showConsentBanner value. This will set a cookie for the consent banner.
	 * @internal
	 */
	_initialData?: Promise<ContractsOutputs['consent']['showBanner'] | undefined>;
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

	// Initialize tracking blocker
	const trackingBlocker =
		typeof window !== 'undefined'
			? createTrackingBlocker(
					trackingBlockerConfig || {},
					storedConsent?.consents || initialState.consents
				)
			: null;

	// Check for client callbacks to integrate with store callbacks
	const clientCallbacks = manager.getCallbacks();

	// Merge client callbacks with initial callbacks
	const mergedCallbacks = clientCallbacks
		? {
				// Map client callbacks to store callbacks format if possible
				onError: clientCallbacks.onError
					? (message: string) =>
							clientCallbacks.onError?.(
								{
									data: null,
									error: {
										message,
										status: 0,
									},
									ok: false,
									response: null,
								},
								'store'
							)
					: undefined,
				// More mappings can be added here as needed
				...initialState.callbacks,
			}
		: initialState.callbacks;

	const store = createStore<PrivacyConsentState>((set, get) => ({
		...initialState,
		ignoreGeoLocation: options.ignoreGeoLocation ?? false,
		config: options.config ?? initialState.config,
		// Set isConsentDomain based on the provider's baseURL
		isConsentDomain,
		// Override the callbacks with merged callbacks
		callbacks: mergedCallbacks,
		// Set initial translation config if provided
		translationConfig: translationConfig || initialState.translationConfig,
		...(storedConsent
			? {
					consents: storedConsent.consents,
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
		 * Updates the consent state for a specific consent type and persists the change.
		 *
		 * @param name - The consent type to update
		 * @param value - The new consent value
		 *
		 * @remarks
		 * This function:
		 * 1. Updates the consent state
		 * 2. Persists changes to localStorage
		 * 3. Triggers consent mode update
		 */
		setConsent: (name, value) => {
			set((state) => {
				const consentType = state.consentTypes.find(
					(type) => type.name === name
				);

				// Don't allow changes to disabled consent types
				if (consentType?.disabled) {
					return state;
				}

				const newConsents = { ...state.consents, [name]: value };

				// Update tracking blocker with new consents
				trackingBlocker?.updateConsents(newConsents);
				updateGTMConsent(newConsents);

				return { consents: newConsents };
			});
		},

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

		/**
		 * Saves user consent preferences and triggers related callbacks.
		 *
		 * @param type - The type of consent being saved
		 *
		 * @remarks
		 * This function:
		 * 1. Updates UI state immediately
		 * 2. Updates consent states based on type
		 * 3. Records consent timestamp
		 * 4. Persists to localStorage
		 * 5. Makes network request in background
		 * 6. Triggers callbacks
		 */
		saveConsents: async (type) => {
			const { callbacks, consents, consentTypes } = get();
			const newConsents = { ...consents };
			if (type === 'all') {
				for (const consent of consentTypes) {
					newConsents[consent.name] = true;
				}
			} else if (type === 'necessary') {
				for (const consent of consentTypes) {
					newConsents[consent.name] = consent.name === 'necessary';
				}
			}

			const consentInfo = {
				time: Date.now(),
				type: type as 'necessary' | 'all' | 'custom',
			};

			// Immediately update the UI state to close banners/dialogs
			// This makes the interface feel more responsive
			set({
				consents: newConsents,
				showPopup: false,
				consentInfo,
			});

			// Update tracking blocker with new consents right away
			trackingBlocker?.updateConsents(newConsents);
			updateGTMConsent(newConsents);

			// Store to localStorage immediately for persistence
			// Wrap in try/catch to handle potential privacy mode errors
			try {
				localStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({
						consents: newConsents,
						consentInfo,
					})
				);
			} catch (e) {
				// biome-ignore lint/suspicious/noConsole: safe degradation
				console.warn('Failed to persist consents to localStorage:', e);
			}

			// Trigger callbacks right away
			callbacks.onConsentGiven?.();
			callbacks.onPreferenceExpressed?.();

			// Send consent to API in the background - the UI is already updated
			const consent = await manager.setConsent({
				body: {
					type: 'cookie_banner',
					domain: window.location.hostname,
					preferences: newConsents,
					metadata: {
						source: 'consent_widget',
						acceptanceMethod: type,
					},
				},
			});

			// Handle error case if the API request fails
			if (!consent.ok) {
				const errorMsg = consent.error?.message ?? 'Failed to save consents';
				callbacks.onError?.(errorMsg);
				// Fallback console only when no handler is provided
				if (!callbacks.onError) {
					// biome-ignore lint/suspicious/noConsole: <explanation>
					console.error(errorMsg);
				}
			}
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
				const resetState = {
					consents: consentTypes.reduce((acc, consent) => {
						acc[consent.name] = consent.defaultValue;
						return acc;
					}, {} as ConsentState),
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
		 */
		setCallback: (name, callback) =>
			set((state) => ({
				callbacks: { ...state.callbacks, [name]: callback },
			})),

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
		 *
		 * @returns The effective consent states considering Do Not Track
		 */
		getEffectiveConsents: () => {
			const { consents, privacySettings } = get();
			return getEffectiveConsents(consents, privacySettings.honorDoNotTrack);
		},

		/**
		 * Checks if consent has been given for a specific type.
		 *
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
		 * Updates the translation configuration.
		 * @param config - The new translation configuration
		 */
		setTranslationConfig: (config: TranslationConfig) => {
			set({ translationConfig: config });
		},
	}));

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
				// biome-ignore lint/suspicious/noConsole: <explanation>
				console.error('Failed to setup Google Tag Manager:', e);
			}
		}

		// Auto-fetch consent banner information if no stored consent
		if (!getStoredConsent()) {
			// Immediately invoke the fetch and wait for it to complete
			// This ensures we have location data before deciding to show the banner
			store.getState().fetchConsentBannerInfo();
		}
	}

	return store;
};
