import type { FetchOptions, ResponseContext } from '../types';
/**
 * Creates a response context object for success cases.
 */
export declare function createResponseContext<T>(
	data?: T | null
): ResponseContext<T>;
/**
 * Handles empty API response with callbacks.
 */
export declare function handleOfflineResponse<ResponseType>(
	options?: FetchOptions<ResponseType>
): Promise<ResponseContext<ResponseType>>;
