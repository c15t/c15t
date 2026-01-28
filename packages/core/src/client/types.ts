/**
 * API endpoint paths
 */
export const API_ENDPOINTS = {
	/**
	 * Path for the init endpoint
	 */
	INIT: '/init',

	/**
	 * Path for recording consent (POST /subject)
	 */
	POST_SUBJECT: '/subject',

	/**
	 * Path for checking a subject's consent (GET /subject/:id)
	 */
	GET_SUBJECT: '/subject',

	/**
	 * Path for linking external ID to subject (PATCH /subject/:id)
	 */
	PATCH_SUBJECT: '/subject',

	/**
	 * Path for checking if externalId has consented (GET /consent/check)
	 */
	CHECK_CONSENT: '/consent/check',

	/**
	 * Path for listing subjects by externalId (GET /subjects)
	 * @remarks Requires API key
	 */
	LIST_SUBJECTS: '/subjects',
} as const;

/**
 * Request configuration options for API requests.
 *
 * This interface defines the options that can be provided when making
 * HTTP requests to the c15t API endpoints.
 *
 * @typeParam ResponseType - The expected response data type
 *
 * @example
 * ```typescript
 * // Basic GET request options
 * const getOptions: FetchOptions<SubjectConsent> = {
 *   method: 'GET',
 *   query: { subjectId: 'sub_x1pftyoufsm7xgo1kv' }
 * };
 *
 * // POST request with error handling
 * const postOptions: FetchOptions<UpdateResult> = {
 *   method: 'POST',
 *   body: { preferences: { analytics: true } },
 *   throw: true,
 *   onError: ({ error }) => {
 *     console.error(`Error ${error.status}: ${error.message}`);
 *   }
 * };
 * ```
 */
export interface FetchOptions<
	ResponseType = unknown,
	BodyType = unknown,
	QueryType = unknown,
> {
	/**
	 * HTTP method for the request.
	 *
	 * Defaults to 'GET' if not specified.
	 */
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

	/**
	 * Request body to send with the request.
	 *
	 * For non-GET requests, this data will be serialized as JSON
	 * and sent in the request body.
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   body: {
	 *     preferences: { analytics: true, marketing: false },
	 *     timestamp: new Date().toISOString()
	 *   }
	 * };
	 * ```
	 */
	body?: BodyType;

	/**
	 * Query parameters to include in the request URL.
	 *
	 * These parameters will be appended to the URL as query string parameters.
	 * Array values will result in multiple query parameters with the same name.
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   query: {
	 *     subjectId: 'sub_x1pftyoufsm7xgo1kv',
	 *     purposes: ['pur_uvrr67my07m7xj2bta', 'pur_vv76m0rtb2dm7xj59gt'], // Results in ?purposes=analytics&purposes=marketing
	 *     includeHistory: true
	 *   }
	 * };
	 * ```
	 */
	query?: QueryType;

	/**
	 * Custom headers to include with this specific request.
	 *
	 * These headers will be merged with the default headers
	 * configured for the client.
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   headers: {
	 *     'X-Request-ID': generateRequestId(),
	 *     'Cache-Control': 'no-cache'
	 *   }
	 * };
	 * ```
	 */
	headers?: Record<string, string>;

	/**
	 * Whether to throw an error when the response is not successful.
	 *
	 * If true, the client will throw an error for non-2xx responses
	 * instead of returning a response context with the error.
	 *
	 * @default false
	 *
	 * @example
	 * ```typescript
	 * // This will throw an error if the request fails
	 * try {
	 *   const result = await client.$fetch('/important-endpoint', {
	 *     throw: true
	 *   });
	 *   // Only runs if request was successful
	 *   processResult(result.data);
	 * } catch (error) {
	 *   handleError(error);
	 * }
	 * ```
	 */
	throw?: boolean;

	/**
	 * Callback function to execute on successful response.
	 *
	 * This function will be called when the request completes successfully
	 * with a 2xx status code.
	 *
	 * @param context The response context containing the result data
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   onSuccess: ({ data }) => {
	 *     console.log('Request succeeded:', data);
	 *     updateUI(data);
	 *   }
	 * };
	 * ```
	 */
	onSuccess?: (context: ResponseContext<ResponseType>) => void | Promise<void>;

	/**
	 * Callback function to execute on error response.
	 *
	 * This function will be called when the request fails with a non-2xx
	 * status code or when an exception occurs during the request.
	 *
	 * @param context The response context containing the error details
	 * @param path The API endpoint path that was requested
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   onError: (context, path) => {
	 *     console.error(`Request to ${path} failed (${context.error?.status}):`, context.error?.message);
	 *     showErrorNotification(context.error?.message || 'Unknown error');
	 *   }
	 * };
	 * ```
	 */
	onError?: (
		context: ResponseContext<ResponseType>,
		path: string
	) => void | Promise<void>;

	/**
	 * Additional fetch options to include in the request.
	 *
	 * These options will be passed directly to the fetch implementation.
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   fetchOptions: {
	 *     credentials: 'include', // Send cookies with cross-origin requests
	 *     mode: 'cors',
	 *     cache: 'no-cache'
	 *   }
	 * };
	 * ```
	 */
	fetchOptions?: RequestInit;

	/**
	 * Request-specific retry configuration. Overrides the global `retryConfig` set in `C15tClientOptions`.
	 */
	retryConfig?: RetryConfig;
}

/**
 * Response context returned from API requests.
 *
 * This interface contains the complete information about an API response,
 * including the data, response object, and any error information.
 *
 * @typeParam ResponseType - The expected response data type
 *
 * @example
 * ```typescript
 * // Processing a response context
 * const response: ResponseContext<SubjectData> = await client.$fetch('/subject/123');
 *
 * if (response.ok) {
 *   // Handle successful response
 *   console.log('Subject data:', response.data);
 *   // Access headers if needed
 *   const etag = response.response?.headers.get('ETag');
 * } else {
 *   // Handle error response
 *   console.error(`Error ${response.error?.status}: ${response.error?.message}`);
 *   if (response.error?.status === 404) {
 *     console.log('Subject not found');
 *   }
 * }
 * ```
 */
export interface ResponseContext<ResponseType = unknown> {
	/**
	 * Response data returned by the API.
	 *
	 * For successful requests, this will contain the parsed JSON response.
	 * For failed requests or non-JSON responses, this will be null.
	 */
	data: ResponseType | null;

	/**
	 * Original fetch Response object.
	 *
	 * This contains the raw response information, such as status, headers, etc.
	 * For network errors or other exceptions, this may be null.
	 */
	response: Response | null;

	/**
	 * Error information if the request failed.
	 *
	 * This will be null for successful requests (2xx status codes).
	 * For failed requests, this contains the error details.
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
	 * Whether the request was successful.
	 *
	 * True for successful requests (2xx status codes), false otherwise.
	 */
	ok: boolean;
}

/**
 * Defines the structure for retry configuration.
 */
export interface RetryConfig {
	/** Maximum number of retry attempts. */
	maxRetries?: number;
	/** Initial delay in milliseconds before the first retry. */
	initialDelayMs?: number;
	/** Factor by which the delay increases for each subsequent retry (e.g., 2 for exponential). */
	backoffFactor?: number;
	/** Array of HTTP status codes that should trigger a retry. */
	retryableStatusCodes?: number[];
	/** Array of HTTP status codes that should never be retried, overrides retryableStatusCodes. */
	nonRetryableStatusCodes?: number[];
	/** Custom function to determine if a response should be retried. Takes precedence over retryableStatusCodes. */
	shouldRetry?: (
		response: Response,
		context: {
			attemptsMade: number;
			url: string;
			method: string;
		}
	) => boolean;
	/** Whether to retry on network errors (e.g., connection timeouts). */
	retryOnNetworkError?: boolean;
}
