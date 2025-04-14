/**
 * A generic type for callback functions that can accept an argument of type T.
 *
 * @typeParam T - The type of the argument that the callback function accepts. Defaults to `void` if not specified.
 *
 * @remarks
 * This type is used throughout the consent management system to define callback functions
 * with consistent typing. It ensures type safety when passing callbacks between components.
 *
 * @example
 * ```typescript
 * // Callback with no arguments
 * const readyCallback: CallbackFunction = () => {
 *   console.log('System ready');
 * };
 *
 * // Callback with string argument
 * const errorCallback: CallbackFunction<string> = (errorMessage) => {
 *   console.error('Error occurred:', errorMessage);
 * };
 * ```
 *
 * @public
 */
export type CallbackFunction<T = void> = (arg: T) => void;

import type { LocationInfo } from './compliance';

/**
 * Defines the structure for callback functions that respond to consent-related events.
 * These callbacks enable custom actions at different stages of the consent management process.
 *
 * @remarks
 * All callbacks are optional and will be called at specific points in the consent management lifecycle:
 *
 * Initialization callbacks:
 * - `onReady`: System initialization complete, ready to handle consent
 * - `onError`: Error occurred during operation
 *
 * Banner interaction callbacks:
 * - `onBannerShown`: Consent banner has been displayed
 * - `onBannerClosed`: Subject has closed the consent banner
 *
 * Consent decision callbacks:
 * - `onConsentGiven`: Subject has granted consent
 * - `onConsentRejected`: Subject has rejected consent
 * - `onPreferenceExpressed`: Subject has made their preferences known
 *
 * @example
 * Basic usage with TypeScript:
 * ```typescript
 * const callbacks: Callbacks = {
 *   onReady: () => {
 *     console.log('Consent manager ready');
 *   },
 *   onError: (error) => {
 *     console.error('Consent manager error:', error);
 *   },
 *   onConsentGiven: () => {
 *     initializeAnalytics();
 *   }
 * };
 * ```
 *
 * @example
 * Full implementation with all callbacks:
 * ```typescript
 * const consentCallbacks: Callbacks = {
 *   onReady: () => {
 *     console.log('Consent manager initialized');
 *     checkInitialConsent();
 *   },
 *
 *   onBannerShown: () => {
 *     logBannerImpression();
 *     pauseBackgroundVideos();
 *   },
 *
 *   onBannerClosed: () => {
 *     resumeBackgroundVideos();
 *     updateUIState('banner-closed');
 *   },
 *
 *   onConsentGiven: () => {
 *     enableTracking();
 *     initializeServices();
 *   },
 *
 *   onConsentRejected: () => {
 *     disableTracking();
 *     updatePrivacyMode('strict');
 *   },
 *
 *   onPreferenceExpressed: () => {
 *     saveUserPreferences();
 *     updateUI();
 *   },
 *
 *   onError: (errorMessage) => {
 *     console.error('Consent Error:', errorMessage);
 *     notifyAdministrator(errorMessage);
 *   }
 * };
 * ```
 *
 * @example
 * Usage with React:
 * ```tsx
 * function ConsentManager() {
 *   const callbacks: Callbacks = useMemo(() => ({
 *     onReady: () => setIsReady(true),
 *     onBannerShown: () => trackEvent('banner-shown'),
 *     onConsentGiven: () => {
 *       initializeAnalytics();
 *       refreshAds();
 *     }
 *   }), []);
 *
 *   return (
 *     <ConsentProvider callbacks={callbacks}>
 *       {children}
 *     </ConsentProvider>
 *   );
 * }
 * ```
 *
 * @see {@link CallbackFunction} For the type definition of individual callbacks
 * @public
 */
export interface Callbacks {
  /** Called when the consent management system is fully initialized and ready */
  onReady?: CallbackFunction;

  /** Called when the consent banner becomes visible to the user */
  onBannerShown?: CallbackFunction;

  /** Called when the consent banner is dismissed or hidden */
  onBannerClosed?: CallbackFunction;

  /** Called when the user grants consent for one or more purposes */
  onConsentGiven?: CallbackFunction;

  /** Called when the user denies consent for one or more purposes */
  onConsentRejected?: CallbackFunction;

  /** Called when the user makes any change to their consent preferences */
  onPreferenceExpressed?: CallbackFunction;

  /**
   * Called when an error occurs in the consent management system
   * @param errorMessage - A description of the error that occurred
   */
  onError?: CallbackFunction<string>;

  /**
   * Called when the user's location is detected
   * @param location - The detected location information
   */
  onLocationDetected?: CallbackFunction<LocationInfo>;
}
