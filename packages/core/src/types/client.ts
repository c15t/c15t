/**
 * Configuration options for initializing a c15t client.
 *
 * This interface defines the required and optional parameters for creating
 * a client that can interact with the c15t consent management API.
 *
 * @example
 * ```typescript
 * // Basic client configuration
 * const options: c15tClientOptions = {
 *   backendURL: 'https://api.example.com/consent',
 * };
 *
 * // Advanced configuration with plugins and custom fetch
 * const advancedOptions: c15tClientOptions = {
 *   backendURL: 'https://api.example.com/consent',
 *   fetchOptions: {
 *     customFetchImpl: nodeFetch // Use node-fetch in Node.js environments
 *   },
 *   plugins: [
 *     analyticsPlugin({ trackConsent: true }),
 *     geoPlugin({ defaultJurisdiction: 'us-ca' })
 *   ]
 * };
 * ```
 */
export interface c15tClientOptions {
	/**
	 * Backend URL for API endpoints. Can be absolute or relative.
	 * If absolute (starts with http:// or https://), the full URL will be used.
	 * If relative (starts with /), it will be appended to the origin.
	 *
	 * @example 'https://api.example.com/consent' or '/api/c15t'
	 * @default '/api/c15t'
	 */
	backendURL: string | false;

	/**
	 * Default request headers to include with all API requests.
	 *
	 * Common headers include API keys, authorization tokens, and content type.
	 * These headers will be included in every request made by the client.
	 *
	 * @example { 'X-API-Key': 'your-api-key', 'Authorization': 'Bearer token' }
	 */
	headers?: Record<string, string>;

	/**
	 * Additional configuration options for the fetch implementation.
	 *
	 * These options control the behavior of the underlying HTTP client.
	 */
	fetchOptions?: {
		/**
		 * Custom fetch implementation to use instead of the global fetch.
		 *
		 * This can be useful for environments without a native fetch,
		 * or for using a fetch implementation with additional features.
		 *
		 * @example
		 * ```typescript
		 * import nodeFetch from 'node-fetch';
		 *
		 * const options = {
		 *   fetchOptions: {
		 *     customFetchImpl: nodeFetch
		 *   }
		 * };
		 * ```
		 */
		customFetchImpl?: typeof fetch;
	};

	/**
	 * Client plugins to extend the core client functionality.
	 *
	 * Plugins can add additional methods and features to the client,
	 * such as analytics tracking, geo-location services, etc.
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   plugins: [
	 *     analyticsPlugin({
	 *       trackConsentChanges: true,
	 *       eventPrefix: 'consent_'
	 *     }),
	 *     geoPlugin({
	 *       defaultJurisdiction: 'us-ca',
	 *       cacheResults: true
	 *     })
	 *   ]
	 * };
	 * ```
	 */
	plugins?: c15tClientPlugin[];
}

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
	 *
	 * @example
	 * ```typescript
	 * const options = {
	 *   onError: ({ error }) => {
	 *     console.error(`Request failed (${error.status}):`, error.message);
	 *     showErrorNotification(error.message);
	 *   }
	 * };
	 * ```
	 */
	onError?: (context: ResponseContext<ResponseType>) => void | Promise<void>;

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
	} | null;

	/**
	 * Whether the request was successful.
	 *
	 * True for successful requests (2xx status codes), false otherwise.
	 */
	ok: boolean;
}

/**
 * Client plugin interface for extending the c15t client functionality.
 *
 * Plugins can add additional methods and features to the client,
 * such as analytics tracking, geo-location services, etc.
 *
 * @example
 * ```typescript
 * // Defining a custom plugin
 * const analyticsPlugin = (options = {}): c15tClientPlugin => ({
 *   id: 'analytics',
 *
 *   init: (client) => {
 *     console.log('Analytics plugin initialized');
 *   },
 *
 *   methods: {
 *     trackEvent: async (eventName, properties) => {
 *       // Implementation logic
 *       return { success: true };
 *     },
 *
 *     getAnalyticsConsent: async () => {
 *       // Get analytics-specific consent
 *       return { allowed: true };
 *     }
 *   }
 * });
 *
 * // Using the plugin
 * const client = createConsentClient({
 *   backendURL: 'https://api.example.com',
 *   plugins: [analyticsPlugin({ trackPageviews: true })]
 * });
 *
 * // Now you can use the plugin methods
 * client.trackEvent('button_click', { buttonId: 'submit' });
 * ```
 */
export interface c15tClientPlugin {
	/**
	 * Unique plugin identifier.
	 *
	 * This ID should be unique across all plugins to avoid conflicts.
	 */
	id: string;

	/**
	 * Plugin initialization function.
	 *
	 * This function is called when the plugin is registered with the client.
	 * It can be used to set up the plugin and perform any necessary initialization.
	 *
	 * @param client The c15t client instance this plugin is being initialized with
	 */
	init?: (client: c15tClient) => void;

	/**
	 * Extensions to client methods.
	 *
	 * These methods will be added to the client instance, allowing plugins
	 * to extend the client's functionality with additional methods.
	 */
	methods?: Record<string, (...args: unknown[]) => unknown>;

	/**
	 * Type inference for the server-side plugin implementation.
	 *
	 * This is used for type checking to ensure the client plugin is compatible
	 * with the server-side plugin implementation.
	 *
	 * @internal This property is primarily for TypeScript type checking
	 */
	$InferServerPlugin?: Record<string, unknown>;
}

/**
 * Interface for c15t client instance.
 * This is used for the plugin init type to avoid circular references.
 *
 * @internal This interface is primarily used internally for type definitions
 */
export interface c15tClient {
	/**
	 * Makes a custom API request to any endpoint.
	 *
	 * @typeParam ResponseType - The expected response data type
	 * @param path - The API endpoint path
	 * @param options - Request configuration options
	 * @returns Response context containing the requested data if successful
	 */
	$fetch<ResponseType>(
		path: string,
		options?: FetchOptions<ResponseType>
	): Promise<ResponseContext<ResponseType>>;

	/**
	 * Index signature to allow dynamic access to properties.
	 * This enables plugins to add methods to the client.
	 */
	[key: string]: unknown;
}
