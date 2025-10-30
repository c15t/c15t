import type { FetchOptions, ResponseContext, RetryConfig } from '../types';
import { createResponseContext as createResponseContextShared } from '../utils';
import {
	ABSOLUTE_URL_REGEX,
	DEFAULT_RETRY_CONFIG,
	LEADING_SLASHES_REGEX,
	TRAILING_SLASHES_REGEX,
} from './constants';
import { delay, generateUUID } from './utils';

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
export function resolveUrl(backendURL: string, path: string): string {
	// Case 1: backendURL is already an absolute URL (includes protocol)
	if (ABSOLUTE_URL_REGEX.test(backendURL)) {
		const backendURLObj = new URL(backendURL);
		// Remove trailing slashes from base path and leading slashes from the path to join
		const basePath = backendURLObj.pathname.replace(TRAILING_SLASHES_REGEX, '');
		const cleanPath = path.replace(LEADING_SLASHES_REGEX, '');
		// Combine the paths with a single slash
		const newPath = `${basePath}/${cleanPath}`;
		// Set the new path on the URL object
		backendURLObj.pathname = newPath;
		return backendURLObj.toString();
	}

	// Case 2: backendURL is relative (like '/api/c15t')
	// For relative URLs, we use string concatenation with proper slash handling
	const cleanBase = backendURL.replace(TRAILING_SLASHES_REGEX, '');
	const cleanPath = path.replace(LEADING_SLASHES_REGEX, '');
	return `${cleanBase}/${cleanPath}`;
}

/**
 * Re-export createResponseContext from shared utils for convenience
 */
export const createResponseContext = createResponseContextShared;

/**
 * Makes an HTTP request to the API with retry logic.
 */
export async function fetcher<
	ResponseType,
	BodyType = unknown,
	QueryType = unknown,
>(
	context: FetcherContext,
	path: string,
	options?: FetchOptions<ResponseType, BodyType, QueryType>
): Promise<ResponseContext<ResponseType>> {
	// Determine the final retry configuration (request overrides global)
	const finalRetryConfig: RetryConfig = {
		...context.retryConfig,
		...(options?.retryConfig || {}),
		retryableStatusCodes:
			options?.retryConfig?.retryableStatusCodes ??
			context.retryConfig.retryableStatusCodes ??
			DEFAULT_RETRY_CONFIG.retryableStatusCodes,
		nonRetryableStatusCodes:
			options?.retryConfig?.nonRetryableStatusCodes ??
			context.retryConfig.nonRetryableStatusCodes ??
			DEFAULT_RETRY_CONFIG.nonRetryableStatusCodes,
	};

	const {
		maxRetries,
		initialDelayMs,
		backoffFactor,
		retryableStatusCodes,
		nonRetryableStatusCodes,
		retryOnNetworkError,
	} = finalRetryConfig;

	// Keep track of attempts (0-based)
	let attemptsMade = 0;
	let currentDelay = initialDelayMs;
	let lastErrorResponse: ResponseContext<ResponseType> | null = null;

	// Loop for initial request + retries
	// We're using a 0-based attempt counter, so we'll make a total of maxRetries+1 attempts
	// (initial request = attempt 0, then retries 1 through maxRetries)
	while (attemptsMade <= (maxRetries ?? 0)) {
		const requestId = generateUUID(); // Generate new ID for each attempt
		const fetchImpl = context.customFetch || globalThis.fetch;

		// Resolve the full URL using the resolveUrl method
		const resolvedUrl = resolveUrl(context.backendURL, path);
		let url: URL;

		try {
			// Create URL object from the resolved URL
			url = new URL(resolvedUrl);
		} catch {
			// If the URL is relative, create it using window.location as base
			url = new URL(resolvedUrl, window.location.origin);
		}

		// Add query parameters
		if (options?.query) {
			for (const [key, value] of Object.entries(options.query)) {
				if (value !== undefined) {
					url.searchParams.append(key, String(value));
				}
			}
		}

		const requestOptions: RequestInit = {
			method: options?.method || 'GET',
			mode: context.corsMode, // Use configured CORS mode
			credentials: 'include', // Always include credentials by default
			headers: {
				...context.headers,
				'X-Request-ID': requestId,
				...options?.headers,
			},
			...options?.fetchOptions,
		};

		if (options?.body && requestOptions.method !== 'GET') {
			requestOptions.body = JSON.stringify(options.body);
		}

		try {
			// Make the request
			const response = await fetchImpl(url.toString(), requestOptions);

			// Parse response
			let data: unknown = null;
			let parseError: unknown = null;

			try {
				const contentType = response.headers.get('content-type');
				if (
					contentType?.includes('application/json') &&
					response.status !== 204 && // No content
					response.headers.get('content-length') !== '0' // Explicit zero length
				) {
					data = await response.json();
				} else if (response.status === 204) {
					// Handle No Content explicitly
					data = null;
				}
			} catch (err) {
				parseError = err;
			}

			// Handle parse errors - No retry for parse errors
			if (parseError) {
				const errorResponse = createResponseContext<ResponseType>(
					false,
					null,
					{
						message: 'Failed to parse response',
						status: response.status,
						code: 'PARSE_ERROR',
						cause: parseError,
					},
					response
				);

				options?.onError?.(errorResponse, path);

				if (options?.throw) {
					throw new Error('Failed to parse response');
				}
				return errorResponse; // Return immediately, no retry
			}

			// Determine if the request was successful
			const isSuccess = response.status >= 200 && response.status < 300;

			if (isSuccess) {
				const successResponse = createResponseContext<ResponseType>(
					true,
					data as ResponseType, // Assume data is ResponseType on success
					null,
					response
				);

				options?.onSuccess?.(successResponse);
				return successResponse; // Return successful response
			}

			// Handle API errors (non-2xx status codes)
			const errorData = data as {
				// Type assertion for error structure
				message: string;
				code: string;
				details: Record<string, unknown> | null;
			} | null; // Allow data to be null if parsing failed or status was 204

			const errorResponse = createResponseContext<ResponseType>(
				false,
				null,
				{
					message:
						errorData?.message ||
						`Request failed with status ${response.status}`,
					status: response.status,
					code: errorData?.code || 'API_ERROR',
					details: errorData?.details || null,
				},
				response
			);

			// Store last error response for return if all retries fail
			lastErrorResponse = errorResponse;

			// Check if we should retry based on status code and custom retry strategy
			let shouldRetryThisRequest = false;

			// Check first if this is a status code that should never be retried
			if (nonRetryableStatusCodes?.includes(response.status)) {
				console.debug(
					`Not retrying request to ${path} with status ${response.status} (nonRetryableStatusCodes)`
				);
				shouldRetryThisRequest = false;
			}
			// Apply custom retry strategy if provided - it takes precedence over retryableStatusCodes
			else if (typeof finalRetryConfig.shouldRetry === 'function') {
				try {
					shouldRetryThisRequest = finalRetryConfig.shouldRetry(response, {
						attemptsMade,
						url: url.toString(),
						method: requestOptions.method || 'GET',
					});
					console.debug(
						`Custom retry strategy for ${path} with status ${response.status}: ${shouldRetryThisRequest}`
					);
				} catch {
					// Fall back to status code check if custom function throws
					shouldRetryThisRequest =
						retryableStatusCodes?.includes(response.status) ?? false;
					console.debug(
						`Custom retry strategy failed, falling back to status code check: ${shouldRetryThisRequest}`
					);
				}
			} else {
				// Fall back to retryableStatusCodes if no custom strategy
				shouldRetryThisRequest =
					retryableStatusCodes?.includes(response.status) ?? false;
				console.debug(
					`Standard retry check for ${path} with status ${response.status}: ${shouldRetryThisRequest}`
				);
			}

			// Don't retry if we've already made maximum attempts
			if (!shouldRetryThisRequest || attemptsMade >= (maxRetries ?? 0)) {
				// Don't retry - call callbacks and potentially throw
				options?.onError?.(errorResponse, path);

				if (options?.throw) {
					throw new Error(errorResponse.error?.message || 'Request failed');
				}
				return errorResponse; // Return the error response
			}

			// Increment attempt count BEFORE retrying
			attemptsMade++;

			// Wait before retrying
			await delay(currentDelay ?? 0);
			currentDelay = (currentDelay ?? 0) * (backoffFactor ?? 2); // Exponential backoff
		} catch (fetchError) {
			// Handle network/request errors
			// Don't retry if it was a parse error thrown from above
			if (
				fetchError &&
				(fetchError as Error).message === 'Failed to parse response'
			) {
				throw fetchError; // Re-throw parse errors immediately
			}

			const isNetworkError = !(fetchError instanceof Response);

			// Create error context for network error
			const errorResponse = createResponseContext<ResponseType>(
				false,
				null,
				{
					message:
						fetchError instanceof Error
							? fetchError.message
							: String(fetchError),
					status: 0, // Indicate network error or similar
					code: 'NETWORK_ERROR',
					cause: fetchError,
				},
				null // No response object available
			);

			// Store last error response
			lastErrorResponse = errorResponse;

			// Check if we should retry based on network error setting
			const shouldRetryThisRequest = isNetworkError && retryOnNetworkError;

			// Don't retry if we've already made maximum attempts
			if (!shouldRetryThisRequest || attemptsMade >= (maxRetries ?? 0)) {
				options?.onError?.(errorResponse, path);

				if (options?.throw) {
					throw fetchError; // Re-throw the original fetch error
				}
				return errorResponse; // Return the error response
			}

			// Increment attempt count BEFORE retrying
			attemptsMade++;

			// Wait before retrying
			await delay(currentDelay ?? 0);
			currentDelay = (currentDelay ?? 0) * (backoffFactor ?? 2); // Exponential backoff
		}
	} // End of while loop

	// This should be unreachable with the above logic
	// But just in case, return the last error we encountered
	const maxRetriesErrorResponse =
		lastErrorResponse ||
		createResponseContext<ResponseType>(
			false,
			null,
			{
				message: `Request failed after ${maxRetries} retries`,
				status: 0,
				code: 'MAX_RETRIES_EXCEEDED',
			},
			null
		);

	options?.onError?.(maxRetriesErrorResponse, path);

	if (options?.throw) {
		throw new Error(`Request failed after ${maxRetries} retries`);
	}

	return maxRetriesErrorResponse;
}
