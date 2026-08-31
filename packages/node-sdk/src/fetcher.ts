import { C15TError } from './error';
import { C15T_VERSION_HEADERS } from './headers';
import type { FetchOptions, ResponseContext, RetryConfig } from './types';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	backoffFactor: 2,
	initialDelayMs: 100,
	maxRetries: 3,
	nonRetryableStatusCodes: [400, 401, 403, 404],
	retryOnNetworkError: true,
	retryableStatusCodes: [500, 502, 503, 504],
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
const debugLog = function debugLog(
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
};

/**
 * Delay utility for retry backoff
 */
const delay = (ms: number): Promise<void> =>
	createDeferredPromise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a UUID v4 for request identification
 */
const generateUUID = function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/gu, (c) => {
		const r = Math.floor(Math.random() * 16);
		const v = c === 'x' ? r : (r % 4) + 8;
		return v.toString(16);
	});
};

/**
 * Creates a response context object with Result-like helper methods
 */
export const createResponseContext = function createResponseContext<T>(
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
		/**
		 * Unwraps the response data, throwing a C15TError with custom message if the request failed.
		 */
		expect(message: string): T {
			if (!isSuccess || data === null) {
				throw new C15TError({
					cause: error?.cause,
					code: error?.code,
					details: error?.details,
					message,
					status: error?.status || 0,
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
		ok: isSuccess,
		response,
		/**
		 * Unwraps the response data, throwing a C15TError if the request failed.
		 */
		unwrap(): T {
			if (!isSuccess || data === null) {
				throw new C15TError({
					cause: error?.cause,
					code: error?.code,
					details: error?.details,
					message: error?.message || 'Request failed',
					status: error?.status || 0,
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
	};
};

/**
 * Resolves a URL path against the base URL
 */
export const resolveUrl = function resolveUrl(
	baseUrl: string,
	path: string
): string {
	// Remove trailing slash from base URL
	const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
	// Remove leading slash from path
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	return `${cleanBase}/${cleanPath}`;
};

type AttemptOutcome<ResponseType> =
	| { retry: true }
	| { response: ResponseContext<ResponseType>; retry: false };

const parseResponseData = async (
	response: Response
): Promise<{ data: unknown; parseError: unknown }> => {
	try {
		const contentType = response.headers.get('content-type');
		if (
			contentType?.includes('application/json') &&
			response.status !== 204 &&
			response.headers.get('content-length') !== '0'
		) {
			return { data: await response.json(), parseError: null };
		}
		return { data: null, parseError: null };
	} catch (parseError) {
		return { data: null, parseError };
	}
};

const processApiError = <ResponseType, BodyType, QueryType>(
	response: Response,
	data: unknown,
	requestMethod: string,
	path: string,
	durationMs: number,
	context: FetcherContext,
	options: FetchOptions<ResponseType, BodyType, QueryType> | undefined,
	retryableStatusCodes: number[],
	nonRetryableStatusCodes: number[],
	attemptsMade: number,
	maxRetries: number
): AttemptOutcome<ResponseType> => {
	const errorData = data as {
		message?: string;
		code?: string;
		details?: Record<string, unknown> | null;
	} | null;
	const errorResponse = createResponseContext<ResponseType>(
		false,
		null,
		{
			code: errorData?.code || 'API_ERROR',
			details: errorData?.details || null,
			message:
				errorData?.message || `Request failed with status ${response.status}`,
			status: response.status,
		},
		response
	);
	const retry =
		!nonRetryableStatusCodes.includes(response.status) &&
		retryableStatusCodes.includes(response.status) &&
		attemptsMade < maxRetries;
	if (retry) {
		return { retry: true };
	}

	debugLog(context.debug, requestMethod, path, durationMs, response.status);
	options?.onError?.(errorResponse, path);
	if (options?.throw) {
		throw new Error(errorResponse.error?.message || 'Request failed');
	}
	return { response: errorResponse, retry: false };
};

const processResponse = async <ResponseType, BodyType, QueryType>(
	response: Response,
	requestMethod: string,
	path: string,
	durationMs: number,
	context: FetcherContext,
	options: FetchOptions<ResponseType, BodyType, QueryType> | undefined,
	retryableStatusCodes: number[],
	nonRetryableStatusCodes: number[],
	attemptsMade: number,
	maxRetries: number
): Promise<AttemptOutcome<ResponseType>> => {
	const { data, parseError } = await parseResponseData(response);
	if (parseError) {
		const errorResponse = createResponseContext<ResponseType>(
			false,
			null,
			{
				cause: parseError,
				code: 'PARSE_ERROR',
				message: 'Failed to parse response',
				status: response.status,
			},
			response
		);
		options?.onError?.(errorResponse, path);
		if (options?.throw) {
			throw new Error('Failed to parse response');
		}
		return { response: errorResponse, retry: false };
	}

	if (response.ok) {
		debugLog(context.debug, requestMethod, path, durationMs, response.status);
		const successResponse = createResponseContext<ResponseType>(
			true,
			data as ResponseType,
			null,
			response
		);
		options?.onSuccess?.(successResponse);
		return { response: successResponse, retry: false };
	}

	return processApiError(
		response,
		data,
		requestMethod,
		path,
		durationMs,
		context,
		options,
		retryableStatusCodes,
		nonRetryableStatusCodes,
		attemptsMade,
		maxRetries
	);
};

const processFetchError = <ResponseType, BodyType, QueryType>(
	fetchError: unknown,
	requestMethod: string,
	path: string,
	startTime: number,
	timeoutMs: number,
	context: FetcherContext,
	options: FetchOptions<ResponseType, BodyType, QueryType> | undefined,
	retryOnNetworkError: boolean,
	attemptsMade: number,
	maxRetries: number
): AttemptOutcome<ResponseType> => {
	if (
		fetchError instanceof Error &&
		fetchError.message === 'Failed to parse response'
	) {
		throw fetchError;
	}
	const isAbortError =
		fetchError instanceof Error && fetchError.name === 'AbortError';
	let message = String(fetchError);
	if (fetchError instanceof Error) {
		({ message } = fetchError);
	}
	if (isAbortError) {
		message = `Request timed out after ${timeoutMs}ms`;
	}
	const errorResponse = createResponseContext<ResponseType>(
		false,
		null,
		{
			cause: fetchError,
			code: isAbortError ? 'TIMEOUT' : 'NETWORK_ERROR',
			message,
			status: 0,
		},
		null
	);
	const retry =
		!(fetchError instanceof Response) &&
		retryOnNetworkError &&
		attemptsMade < maxRetries;
	if (retry) {
		return { retry: true };
	}

	debugLog(context.debug, requestMethod, path, Date.now() - startTime, 'ERROR');
	options?.onError?.(errorResponse, path);
	if (options?.throw) {
		throw fetchError;
	}
	return { response: errorResponse, retry: false };
};

/**
 * Makes an HTTP request with retry logic
 */
export const fetcher = function fetcher<
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

	const executeAttempt = async (): Promise<ResponseContext<ResponseType>> => {
		const requestId = generateUUID();

		// Build URL with query parameters
		const resolvedUrl = resolveUrl(context.baseUrl, path);
		const url = new URL(resolvedUrl);

		if (options?.query) {
			Object.entries(options.query as Record<string, unknown>).forEach(
				([key, value]) => {
					if (value !== undefined && value !== null) {
						url.searchParams.append(key, String(value));
					}
				}
			);
		}

		// Set up timeout with AbortController
		const timeoutMs = options?.timeout ?? context.timeout;
		const controller = new AbortController();
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		if (timeoutMs > 0) {
			timeoutId = setTimeout(() => controller.abort(), timeoutMs);
		}

		const requestOptions: RequestInit = {
			headers: {
				'Content-Type': 'application/json',
				...C15T_VERSION_HEADERS,
				...context.headers,
				'X-Request-ID': requestId,
				...options?.headers,
			},
			method: options?.method || 'GET',
			signal: controller.signal,
		};

		if (options?.body && requestOptions.method !== 'GET') {
			requestOptions.body = JSON.stringify(options.body);
		}

		const startTime = Date.now();
		const requestMethod = requestOptions.method || 'GET';

		try {
			const response = await fetch(url.toString(), requestOptions);

			// Clear timeout on successful response
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			const outcome = await processResponse(
				response,
				requestMethod,
				path,
				Date.now() - startTime,
				context,
				options,
				retryableStatusCodes,
				nonRetryableStatusCodes,
				attemptsMade,
				maxRetries
			);
			if (!outcome.retry) {
				return outcome.response;
			}
		} catch (fetchError) {
			// Clear timeout on error
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			const outcome = processFetchError(
				fetchError,
				requestMethod,
				path,
				startTime,
				timeoutMs,
				context,
				options,
				retryOnNetworkError,
				attemptsMade,
				maxRetries
			);
			if (!outcome.retry) {
				return outcome.response;
			}
		}

		attemptsMade += 1;
		await delay(currentDelay);
		currentDelay *= backoffFactor;
		return executeAttempt();
	};

	return executeAttempt();
};
