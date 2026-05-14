/**
 * Store update logic for consent manager initialization.
 *
 * @packageDocumentation
 */
import type { ConsentStoreState } from '../../store/type';
import type { GlobalVendorList } from '../../types/iab-tcf';
import type { ConsentBannerResponse, InitConsentManagerConfig } from './types';
interface InitSourceMetadata {
	initDataSource: ConsentStoreState['initDataSource'];
	initDataSourceDetail?: string | null;
}
/**
 * Updates the store with consent banner data.
 *
 * This function:
 * 1. Determines the consent model based on jurisdiction
 * 2. Auto-grants consents if no regulation applies
 * 3. Updates location and translation info
 * 4. Triggers appropriate callbacks
 * 5. Initializes IAB mode if enabled and GVL is available
 *
 * Note: If client has IAB enabled but server returns 200 without GVL,
 * the IAB settings will be overridden to disabled (server takes precedence).
 *
 * @param data - Banner response data from the API
 * @param config - Init configuration
 * @param _hasLocalStorageAccess - Whether localStorage is accessible
 * @param prefetchedGVL - Optional prefetched GVL from SSR or init response
 */
export declare function updateStore(
	data: ConsentBannerResponse,
	config: InitConsentManagerConfig,
	_hasLocalStorageAccess: boolean,
	prefetchedGVL?: GlobalVendorList | null,
	initSourceMetadata?: InitSourceMetadata
): Promise<void>;
export {};
