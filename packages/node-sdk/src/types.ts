/**
 * Configuration options for the C15T SDK client
 */
export interface C15TClientOptions {
	/**
	 * Base URL for the API server.
	 * If not provided, falls back to C15T_API_URL environment variable.
	 * @example "https://api.example.com"
	 */
	baseUrl?: string;

	/**
	 * Authentication token (if needed).
	 * If not provided, falls back to C15T_API_TOKEN environment variable.
	 * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
	 */
	token?: string;

	/**
	 * Additional headers to include with each request
	 */
	headers?: Record<string, string>;

	/**
	 * Prefix path for API endpoints
	 * @default "/"
	 */
	prefix?: string;

	/**
	 * Retry configuration for failed requests
	 */
	retryConfig?: RetryConfig;

	/**
	 * Enable debug mode to log requests and responses.
	 * Can also be enabled via C15T_DEBUG=true environment variable.
	 * @default false
	 * @example
	 * ```typescript
	 * const client = c15tClient({
	 *   baseUrl: 'https://api.example.com',
	 *   debug: true,
	 * });
	 * // Console output:
	 * // [c15t] GET /status (142ms) -> 200
	 * ```
	 */
	debug?: boolean;

	/**
	 * Request timeout in milliseconds.
	 * Requests exceeding this timeout will be aborted.
	 * @default 30000 (30 seconds)
	 * @example
	 * ```typescript
	 * const client = c15tClient({
	 *   baseUrl: 'https://api.example.com',
	 *   timeout: 5000, // 5 seconds
	 * });
	 * ```
	 */
	timeout?: number;
}

/**
 * Retry configuration for HTTP requests
 */
export interface RetryConfig {
	/**
	 * Maximum number of retry attempts
	 * @default 3
	 */
	maxRetries?: number;

	/**
	 * Initial delay in milliseconds before the first retry
	 * @default 100
	 */
	initialDelayMs?: number;

	/**
	 * Factor by which the delay increases for each subsequent retry
	 * @default 2
	 */
	backoffFactor?: number;

	/**
	 * Array of HTTP status codes that should trigger a retry
	 * @default [500, 502, 503, 504]
	 */
	retryableStatusCodes?: number[];

	/**
	 * Array of HTTP status codes that should never be retried
	 * @default [400, 401, 403, 404]
	 */
	nonRetryableStatusCodes?: number[];

	/**
	 * Whether to retry on network errors
	 * @default true
	 */
	retryOnNetworkError?: boolean;
}

/**
 * Response context returned from API requests.
 *
 * Provides Result-like helper methods for ergonomic error handling.
 */
export interface ResponseContext<T = unknown> {
	/**
	 * Response data returned by the API
	 */
	data: T | null;

	/**
	 * Original fetch Response object
	 */
	response: Response | null;

	/**
	 * Error information if the request failed
	 */
	error: {
		/**
		 * Error message describing what went wrong
		 */
		message: string;

		/**
		 * HTTP status code or custom error code
		 */
		status: number;

		/**
		 * Optional error code for more specific error identification
		 */
		code?: string;

		/**
		 * Optional cause of the error
		 */
		cause?: unknown;

		/**
		 * Optional additional details about the error
		 */
		details?: Record<string, unknown> | null;
	} | null;

	/**
	 * Whether the request was successful
	 */
	ok: boolean;

	/**
	 * Unwraps the response data, throwing an error if the request failed.
	 *
	 * @throws {Error} If the request was not successful
	 * @returns The response data
	 *
	 * @example
	 * ```typescript
	 * const subject = (await client.getSubject('sub_123')).unwrap();
	 * ```
	 */
	unwrap(): T;

	/**
	 * Unwraps the response data, returning a default value if the request failed.
	 *
	 * @param defaultValue - The value to return if the request failed
	 * @returns The response data or the default value
	 *
	 * @example
	 * ```typescript
	 * const subject = (await client.getSubject('sub_123')).unwrapOr(defaultSubject);
	 * ```
	 */
	unwrapOr(defaultValue: T): T;

	/**
	 * Unwraps the response data, throwing a custom error message if the request failed.
	 *
	 * @param message - Custom error message to throw
	 * @throws {Error} With the provided message if the request was not successful
	 * @returns The response data
	 *
	 * @example
	 * ```typescript
	 * const subject = (await client.getSubject('sub_123')).expect('Subject not found');
	 * ```
	 */
	expect(message: string): T;

	/**
	 * Maps the response data to a new value if successful.
	 *
	 * @param fn - Function to transform the data
	 * @returns A new ResponseContext with the transformed data
	 *
	 * @example
	 * ```typescript
	 * const name = (await client.getSubject('sub_123')).map(s => s.name);
	 * ```
	 */
	map<U>(fn: (data: T) => U): ResponseContext<U>;
}

/**
 * Options for individual fetch requests
 */
export interface FetchOptions<
	ResponseType = unknown,
	BodyType = unknown,
	QueryType = unknown,
> {
	/**
	 * HTTP method for the request
	 * @default 'GET'
	 */
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

	/**
	 * Request body to send with the request
	 */
	body?: BodyType;

	/**
	 * Query parameters to include in the request URL
	 */
	query?: QueryType;

	/**
	 * Custom headers to include with this specific request
	 */
	headers?: Record<string, string>;

	/**
	 * Whether to throw an error when the response is not successful
	 * @default false
	 */
	throw?: boolean;

	/**
	 * Callback function to execute on successful response
	 */
	onSuccess?: (context: ResponseContext<ResponseType>) => void | Promise<void>;

	/**
	 * Callback function to execute on error response
	 */
	onError?: (
		context: ResponseContext<ResponseType>,
		path: string
	) => void | Promise<void>;

	/**
	 * Request-specific retry configuration
	 */
	retryConfig?: RetryConfig;

	/**
	 * Request timeout in milliseconds.
	 * Overrides the global timeout for this specific request.
	 * @example
	 * ```typescript
	 * await client.getSubject('sub_123', undefined, { timeout: 5000 });
	 * ```
	 */
	timeout?: number;
}
