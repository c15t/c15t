import type { StorageConfig } from '../../libs/cookie';
import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { FetcherContext } from './fetcher';
/**
 * Provides offline mode fallback for identifyUser API.
 * Queues the identify request for retry on next page load.
 * @internal
 */
export declare function offlineFallbackForIdentifyUser(
	options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>>;
/**
 * Links an external user ID to a subject via PATCH /subjects/:id.
 * Saves to storage first (optimistic), then makes API call with fallback.
 *
 * @param context - Fetcher context for API requests
 * @param storageConfig - Storage configuration for cookie/localStorage
 * @param options - Request options containing subjectId, externalId, and identityProvider
 * @returns Response context with the updated subject
 */
export declare function identifyUser(
	context: FetcherContext,
	storageConfig: StorageConfig | undefined,
	options: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>>;
