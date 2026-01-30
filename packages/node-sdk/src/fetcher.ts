import { C15TError } from './error';
import type { FetchOptions, ResponseContext, RetryConfig } from './types';

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	initialDelayMs: 100,
	backoffFactor: 2,
	retryableStatusCodes: [500, 502, 503, 504],
	nonRetryableStatusCodes: [400, 401, 403, 404],
	retryOnNetworkError: true,
};

/**
 * Default timeout in milliseconds (30 seconds)
 */
export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Base context for fetcher operations
 */
export interface FetcherContext {
	baseUrl: string;
	headers: Record<string, string>;
	retryConfig: RetryConfig;
	debug: boolean;
	timeout: number;
}

/**
 * Logger for debug mode
 */
function debugLog(
	debug: boolean,
	method: string,
	path: string,
	durationMs: number,
	status: number | 'ERROR'
): void {
	if (!debug) {
		return;
	}
	const timestamp = new Date().toISOString();
	console.log(
		`[c15t] ${timestamp} ${method} ${path} (${durationMs}ms) -> ${status}`
	);
}

/**
 * Delay utility for retry backoff
 */
const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a UUID v4 for request identification
 */
function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * Creates a response context object with Result-like helper methods
 */
export function createResponseContext<T>(
	isSuccess: boolean,
	data: T | null = null,
	error: {
		message: string;
		status: number;
		code?: string;
		cause?: unknown;
		details?: Record<string, unknown> | null;
	} | null = null,
	response: Response | null = null
): ResponseContext<T> {
	return {
		data,
		error,
		ok: isSuccess,
		response,

		/**
		 * Unwraps the response data, throwing a C15TError if the request failed.
		 */
		unwrap(): T {
			if (!isSuccess || data === null) {
				throw new C15TError({
					message: error?.message || 'Request failed',
					status: error?.status || 0,
					code: error?.code,
					details: error?.details,
					cause: error?.cause,
				});
			}
			return data;
		},

		/**
		 * Unwraps the response data, returning a default value if the request failed.
		 */
		unwrapOr(defaultValue: T): T {
			if (!isSuccess || data === null) {
				return defaultValue;
			}
			return data;
		},

		/**
		 * Unwraps the response data, throwing a C15TError with custom message if the request failed.
		 */
		expect(message: string): T {
			if (!isSuccess || data === null) {
				throw new C15TError({
					message,
					status: error?.status || 0,
					code: error?.code,
					details: error?.details,
					cause: error?.cause,
				});
			}
			return data;
		},

		/**
		 * Maps the response data to a new value if successful.
		 */
		map<U>(fn: (d: T) => U): ResponseContext<U> {
			if (!isSuccess || data === null) {
				return createResponseContext<U>(false, null, error, response);
			}
			return createResponseContext<U>(true, fn(data), null, response);
		},
	};
}

/**
 * Resolves a URL path against the base URL
 */
export function resolveUrl(baseUrl: string, path: string): string {
	// Remove trailing slash from base URL
	const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
	// Remove leading slash from path
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	return `${cleanBase}/${cleanPath}`;
}

/**
 * Makes an HTTP request with retry logic
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
	// Merge retry config
	const finalRetryConfig: RetryConfig = {
		...DEFAULT_RETRY_CONFIG,
		...context.retryConfig,
		...(options?.retryConfig || {}),
	};

	const {
		maxRetries = 3,
		initialDelayMs = 100,
		backoffFactor = 2,
		retryableStatusCodes = [500, 502, 503, 504],
		nonRetryableStatusCodes = [400, 401, 403, 404],
		retryOnNetworkError = true,
	} = finalRetryConfig;

	let attemptsMade = 0;
	let currentDelay = initialDelayMs;
	let lastErrorResponse: ResponseContext<ResponseType> | null = null;

	while (attemptsMade <= maxRetries) {
		const requestId = generateUUID();

		// Build URL with query parameters
		const resolvedUrl = resolveUrl(context.baseUrl, path);
		const url = new URL(resolvedUrl);

		if (options?.query) {
			for (const [key, value] of Object.entries(
				options.query as Record<string, unknown>
			)) {
				if (value !== undefined && value !== null) {
					url.searchParams.append(key, String(value));
				}
			}
		}

		// Set up timeout with AbortController
		const timeoutMs = options?.timeout ?? context.timeout;
		const controller = new AbortController();
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		if (timeoutMs > 0) {
			timeoutId = setTimeout(() => controller.abort(), timeoutMs);
		}

		const requestOptions: RequestInit = {
			method: options?.method || 'GET',
			headers: {
				'Content-Type': 'application/json',
				...context.headers,
				'X-Request-ID': requestId,
				...options?.headers,
			},
			signal: controller.signal,
		};

		if (options?.body && requestOptions.method !== 'GET') {
			requestOptions.body = JSON.stringify(options.body);
		}

		const startTime = Date.now();

		try {
			const response = await fetch(url.toString(), requestOptions);

			// Clear timeout on successful response
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			const durationMs = Date.now() - startTime;

			// Parse response
			let data: unknown = null;
			let parseError: unknown = null;

			try {
				const contentType = response.headers.get('content-type');
				if (
					contentType?.includes('application/json') &&
					response.status !== 204 &&
					response.headers.get('content-length') !== '0'
				) {
					data = await response.json();
				} else if (response.status === 204) {
					data = null;
				}
			} catch (err) {
				parseError = err;
			}

			// Handle parse errors - No retry
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
				return errorResponse;
			}

			// Check success
			const isSuccess = response.status >= 200 && response.status < 300;

			if (isSuccess) {
				debugLog(
					context.debug,
					requestOptions.method || 'GET',
					path,
					durationMs,
					response.status
				);

				const successResponse = createResponseContext<ResponseType>(
					true,
					data as ResponseType,
					null,
					response
				);

				options?.onSuccess?.(successResponse);
				return successResponse;
			}

			// Handle API errors
			const errorData = data as {
				message?: string;
				code?: string;
				details?: Record<string, unknown> | null;
			} | null;

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

			lastErrorResponse = errorResponse;

			// Check if we should retry
			let shouldRetryThisRequest = false;

			if (nonRetryableStatusCodes.includes(response.status)) {
				shouldRetryThisRequest = false;
			} else {
				shouldRetryThisRequest = retryableStatusCodes.includes(response.status);
			}

			// Don't retry if max attempts reached
			if (!shouldRetryThisRequest || attemptsMade >= maxRetries) {
				debugLog(
					context.debug,
					requestOptions.method || 'GET',
					path,
					durationMs,
					response.status
				);

				options?.onError?.(errorResponse, path);

				if (options?.throw) {
					throw new Error(errorResponse.error?.message || 'Request failed');
				}
				return errorResponse;
			}

			attemptsMade++;
			await delay(currentDelay);
			currentDelay = currentDelay * backoffFactor;
		} catch (fetchError) {
			// Clear timeout on error
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			// Handle parse error thrown from above
			if (
				fetchError instanceof Error &&
				fetchError.message === 'Failed to parse response'
			) {
				throw fetchError;
			}

			// Check if this is a timeout/abort error
			const isAbortError =
				fetchError instanceof Error && fetchError.name === 'AbortError';

			const isNetworkError = !(fetchError instanceof Response);

			const errorResponse = createResponseContext<ResponseType>(
				false,
				null,
				{
					message: isAbortError
						? `Request timed out after ${timeoutMs}ms`
						: fetchError instanceof Error
							? fetchError.message
							: String(fetchError),
					status: 0,
					code: isAbortError ? 'TIMEOUT' : 'NETWORK_ERROR',
					cause: fetchError,
				},
				null
			);

			lastErrorResponse = errorResponse;

			const shouldRetryThisRequest = isNetworkError && retryOnNetworkError;

			if (!shouldRetryThisRequest || attemptsMade >= maxRetries) {
				debugLog(
					context.debug,
					requestOptions.method || 'GET',
					path,
					Date.now() - startTime,
					'ERROR'
				);

				options?.onError?.(errorResponse, path);

				if (options?.throw) {
					throw fetchError;
				}
				return errorResponse;
			}

			attemptsMade++;
			await delay(currentDelay);
			currentDelay = currentDelay * backoffFactor;
		}
	}

	// Max retries exceeded
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
