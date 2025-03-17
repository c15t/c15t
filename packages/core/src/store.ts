/**
 * @packageDocumentation
 * Implements the core consent management store using Zustand.
 * This module provides the main store creation and management functionality.
 */

import { createStore } from 'zustand/vanilla';
import {
	getEffectiveConsents,
	hasConsentFor,
	hasConsented,
} from './libs/consent-utils';
import {
	DEFAULT_CONSENT_BANNER_API_URL,
	fetchConsentBannerInfo as fetchConsentBanner,
} from './libs/fetch-consent-banner';
import { createTrackingBlocker } from './libs/tracking-blocker';
import type { TrackingBlockerConfig } from './libs/tracking-blocker';
import { initialState } from './store.initial-state';
import type { PrivacyConsentState } from './store.type';
import {
	type ConsentState,
	type TranslationConfig,
	consentTypes,
} from './types';

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
	if (typeof window === 'undefined') return null;

	const stored = localStorage.getItem(STORAGE_KEY);
	if (!stored) return null;

	try {
		return JSON.parse(stored);
	} catch (e) {
		console.error('Failed to parse stored consent:', e);
		return null;
	}
};

interface StoreConfig {
	trackingBlockerConfig?: TrackingBlockerConfig;
	/** URL to fetch consent banner information from */
	consentBannerApiUrl?: string;
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
 * const store = createConsentManagerStore('MyApp');
 *
 * // Access from window
 * const state = window.MyApp.getState();
 * ```
 *
 * @public
 */
export const createConsentManagerStore = (
	namespace: string | undefined = 'c15tStore',
	config?: StoreConfig
) => {
	// Load initial state from localStorage if available
	const storedConsent = getStoredConsent();

	// Initialize tracking blocker
	const trackingBlocker =
		typeof window !== 'undefined'
			? createTrackingBlocker(
					config?.trackingBlockerConfig || {},
					storedConsent?.consents || initialState.consents
				)
			: null;

	const store = createStore<PrivacyConsentState>((set, get) => ({
		...initialState,
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

				return { consents: newConsents };
			});
			get().updateConsentMode();
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
		 */
		setShowPopup: (show, force = false) => {
			const state = get();
			const storedConsent = getStoredConsent();

			// Only show popup if:
			// 1. Force is true, or
			// 2. All of these are true:
			//    - No stored consent
			//    - No current consent info
			//    - Not currently loading consent info
			//    - Show parameter is true
			if (
				force ||
				(!storedConsent &&
					!state.consentInfo &&
					!state.isLoadingConsentInfo &&
					show)
			) {
				set({ showPopup: show });
			}
		},

		/**
		 * Controls the visibility of the privacy dialog.
		 *
		 * @param isOpen - Whether the dialog should be open
		 */
		setIsPrivacyDialogOpen: (isOpen) => {
			set({ isPrivacyDialogOpen: isOpen });
		},

		/**
		 * Saves user consent preferences and triggers related callbacks.
		 *
		 * @param type - The type of consent being saved
		 *
		 * @remarks
		 * This function:
		 * 1. Updates consent states based on type
		 * 2. Records consent timestamp
		 * 3. Persists to localStorage
		 * 4. Updates UI state
		 * 5. Triggers callbacks
		 */
		saveConsents: (type) => {
			const {
				callbacks,
				updateConsentMode,
				consents,
				consentTypes,
				includeNonDisplayedConsents,
			} = get();
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

			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					consents: newConsents,
					consentInfo,
				})
			);

			// Update tracking blocker with new consents
			trackingBlocker?.updateConsents(newConsents);

			set({
				consents: newConsents,
				showPopup: false,
				consentInfo,
			});

			updateConsentMode();
			callbacks.onConsentGiven?.();
			callbacks.onPreferenceExpressed?.();
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
			set((state) => {
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
		 * Updates the applicable jurisdiction information.
		 *
		 * @param jurisdiction - The jurisdiction information
		 */
		setJurisdictionInfo: (jurisdiction) =>
			set({ jurisdictionInfo: jurisdiction }),

		/**
		 * Fetches consent banner information from the API and updates the store.
		 *
		 * @param url - The URL to fetch consent banner information from
		 * @returns A promise that resolves when the fetch is complete
		 *
		 * @remarks
		 * This function:
		 * 1. Fetches consent banner information from the API
		 * 2. Updates the store with the location and jurisdiction information
		 * 3. Sets the showPopup state based on the API response
		 * 4. Updates the detected country based on the location information
		 * 5. Prevents multiple simultaneous requests
		 */
		fetchConsentBannerInfo: async (url) => {
			// Skip if not in browser environment
			if (typeof window === 'undefined') {
				return undefined;
			}

			// Skip if user has already consented
			if (get().hasConsented()) {
				// Make sure loading state is false
				set({ isLoadingConsentInfo: false });
				return undefined;
			}

			// Set loading state to true
			set({ isLoadingConsentInfo: true });

			// Use the extracted fetchConsentBanner function
			try {
				const apiUrl =
					url || config?.consentBannerApiUrl || DEFAULT_CONSENT_BANNER_API_URL;

				return await fetchConsentBanner(
					get().hasConsented,
					(data) => {
						// Update store with location and jurisdiction information
						// and set showPopup based on API response
						set({
							locationInfo: data.location,
							jurisdictionInfo: data.jurisdiction,
							isLoadingConsentInfo: false,
							// Only update showPopup if we don't have stored consent
							...(get().consentInfo === null
								? { showPopup: data.showConsentBanner }
								: {}),
						});

						// Update detected country if location information is available
						if (data.location?.countryCode) {
							get().setDetectedCountry(data.location.countryCode);
						}

						// Call the onLocationDetected callback if it exists
						get().callbacks.onLocationDetected?.(data.location);
					},
					(errorMessage) => {
						// Set loading state to false on error
						set({ isLoadingConsentInfo: false });

						// Call the onError callback if it exists
						get().callbacks.onError?.(errorMessage);

						// If fetch fails, default to showing the banner to be safe
						if (get().consentInfo === null) {
							set({ showPopup: true });
						}
					},
					apiUrl
				);
			} catch (error) {
				// This catch block should not be reached as errors are handled in the fetchConsentBanner function
				// But we keep it as a safety measure
				console.error('Unexpected error in fetchConsentBannerInfo:', error);
				set({ isLoadingConsentInfo: false });
				return undefined;
			}
		},

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
		 * Clears all consent data and resets to initial state.
		 *
		 * @remarks
		 * This function:
		 * 1. Resets state to initial values
		 * 2. Removes stored consent from localStorage
		 */
		clearAllData: () => {
			set(initialState);
			localStorage.removeItem(STORAGE_KEY);
		},

		/**
		 * Updates the consent mode in external systems.
		 *
		 * @remarks
		 * Currently commented out, but designed to update Google Tag Manager
		 * consent states based on user preferences.
		 */
		updateConsentMode: () => {
			const effectiveConsents = get().getEffectiveConsents();
			// if (typeof window !== 'undefined' && window.gtag) {
			//   window.gtag('consent', 'update', {
			//     'ad_storage': effectiveConsents.marketing ? 'granted' : 'denied',
			//     'analytics_storage': effectiveConsents.measurement ? 'granted' : 'denied',
			//     'ad_user_data': effectiveConsents.ad_user_data ? 'granted' : 'denied',
			//     'ad_personalization': effectiveConsents.ad_personalization ? 'granted' : 'denied',
			//   });
			// }
		},

		/**
		 * Updates privacy-related settings.
		 *
		 * @param settings - New privacy settings
		 */
		setPrivacySettings: (settings) =>
			set((state) => ({
				privacySettings: { ...state.privacySettings, ...settings },
			})),

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
		 * Controls whether non-displayed consents should be included.
		 *
		 * @param include - Whether to include non-displayed consents
		 */
		setIncludeNonDisplayedConsents: (include) =>
			set({ includeNonDisplayedConsents: include }),

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

		// Auto-fetch consent banner information if no stored consent
		if (!getStoredConsent()) {
			// Immediately invoke the fetch and wait for it to complete
			// This ensures we have location data before deciding to show the banner
			store
				.getState()
				.fetchConsentBannerInfo()
				.catch(() => {
					// If fetch fails, we've already set showPopup to true in the error handler
					console.log(
						'Failed to fetch consent banner information, defaulting to showing banner'
					);
				});
		}
	}

	return store;
};

export default createConsentManagerStore;
