import type { FetchOptions, ResponseContext } from '../types';
import type { FetcherContext } from './fetcher';
import { fetcher } from './fetcher';

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
export async function withFallback<
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
): Promise<ResponseContext<ResponseType>> {
	try {
		// First try the actual API request
		const response = await fetcher<ResponseType, BodyType, QueryType>(
			context,
			endpoint,
			{
				method,
				...options,
			}
		);

		// If the request was successful, return it
		if (response.ok) {
			return response;
		}

		// If we got here, the request failed but didn't throw - fall back to offline mode
		console.warn(
			`API request failed, falling back to offline mode for ${endpoint}`
		);
		return fallbackFn(options);
	} catch (error) {
		// If an error was thrown, fall back to offline mode
		console.warn(
			`Error calling ${endpoint}, falling back to offline mode:`,
			error
		);
		return fallbackFn(options);
	}
}
