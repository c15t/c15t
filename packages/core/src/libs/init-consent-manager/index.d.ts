/**
 * Consent Manager Initialization
 *
 * Handles fetching and processing consent banner information,
 * including SSR data hydration and IAB TCF mode initialization.
 *
 * @packageDocumentation
 */
import type { ConsentBannerResponse, InitConsentManagerConfig } from './types';
export type { ConsentBannerResponse, InitConsentManagerConfig } from './types';
/**
 * Initializes the consent manager by fetching jurisdiction, location,
 * translations, and branding information.
 *
 * This function handles:
 * - SSR data hydration (uses prefetched data if available)
 * - Client-side API fetching (fallback when no SSR data)
 * - Store state updates
 * - Callback triggers
 * - IAB TCF mode initialization (if enabled)
 *
 * @param config - Configuration object containing store and manager instances
 * @returns A promise that resolves with the consent banner response
 *
 * @example
 * ```typescript
 * const response = await initConsentManager({
 *   manager: consentManager,
 *   get: store.getState,
 *   set: store.setState,
 *   ssrData: ssrPrefetchedData,
 * });
 * ```
 */
export declare function initConsentManager(
	config: InitConsentManagerConfig
): Promise<ConsentBannerResponse | undefined>;
