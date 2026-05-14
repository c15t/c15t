import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { FetcherContext } from './fetcher';
import type { IABFallbackConfig } from './types';
/**
 * Provides offline mode fallback for showConsentBanner API.
 * Simulates the behavior of OfflineClient when API requests fail.
 * In fallback mode, fetches GVL from gvl.consent.io when IAB is enabled.
 * @internal
 */
export declare function offlineFallbackForConsentBanner(
	options?: FetchOptions<InitResponse>,
	iabConfig?: IABFallbackConfig
): Promise<ResponseContext<InitResponse>>;
/**
 * Checks if a consent banner should be shown.
 * If the API request fails, falls back to offline mode behavior.
 */
export declare function init(
	context: FetcherContext,
	options?: FetchOptions<InitResponse>,
	iabConfig?: IABFallbackConfig
): Promise<ResponseContext<InitResponse>>;
