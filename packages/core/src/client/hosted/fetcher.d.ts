import type { FetchOptions, ResponseContext, RetryConfig } from '../types';
import { createResponseContext as createResponseContextShared } from '../utils';
/**
 * Base client context for fetcher operations
 */
export interface FetcherContext {
	backendURL: string;
	headers: Record<string, string>;
	customFetch?: typeof fetch;
	corsMode: RequestMode;
	retryConfig: RetryConfig;
}
/**
 * Resolves a URL path against the backend URL, handling both absolute and relative URLs.
 *
 * @param backendURL - The backend URL (can be absolute or relative)
 * @param path - The path to append
 * @returns The resolved URL string
 */
export declare function resolveUrl(backendURL: string, path: string): string;
/**
 * Re-export createResponseContext from shared utils for convenience
 */
export declare const createResponseContext: typeof createResponseContextShared;
/**
 * Makes an HTTP request to the API with retry logic.
 */
export declare function fetcher<
	ResponseType,
	BodyType = unknown,
	QueryType = unknown,
>(
	context: FetcherContext,
	path: string,
	options?: FetchOptions<ResponseType, BodyType, QueryType>
): Promise<ResponseContext<ResponseType>>;
