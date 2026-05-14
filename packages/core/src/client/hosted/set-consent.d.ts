import type {
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { FetcherContext } from './fetcher';
/**
 * Provides offline mode fallback for setConsent API.
 * Simulates the behavior of OfflineClient when API requests fail.
 * @internal
 */
export declare function offlineFallbackForSetConsent(
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>>;
/**
 * Sets consent preferences for a subject.
 * If the API request fails, falls back to offline mode behavior.
 */
export declare function setConsent(
	context: FetcherContext,
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>>;
