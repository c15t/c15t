import type { FetchOptions, ResponseContext } from '../types';
import type { FetcherContext } from './fetcher';
/**
 * Generic fallback/retry wrapper for API requests.
 * Attempts to call the API, and if it fails, calls the provided fallback function.
 *
 * @param context - Fetcher context for API requests
 * @param endpoint - API endpoint path
 * @param method - HTTP method ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')
 * @param options - Request options
 * @param fallbackFn - Fallback function to call if API request fails
 * @returns Response from API or fallback
 * @internal
 */
export declare function withFallback<
	ResponseType,
	BodyType = unknown,
	QueryType = unknown,
>(
	context: FetcherContext,
	endpoint: string,
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
	options: FetchOptions<ResponseType, BodyType, QueryType> | undefined,
	fallbackFn: (
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	) => Promise<ResponseContext<ResponseType>>
): Promise<ResponseContext<ResponseType>>;
