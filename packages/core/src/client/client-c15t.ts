/**
 * c15t backend implementation of the consent client interface.
 * This client makes HTTP requests to the c15t consent management backend.
 */

import type {
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '@c15t/backend';

import type {
	ConsentManagerCallbacks,
	ConsentManagerInterface,
} from './client-interface';

import {
	API_ENDPOINTS,
	type FetchOptions,
	type ResponseContext,
	type RetryConfig,
} from './types';

/**
 * Default retry configuration
 * @internal
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3, // Setting to 0 will still allow the initial request but no retries
	initialDelayMs: 100,
	backoffFactor: 2,
	retryableStatusCodes: [500, 502, 503, 504], // Default retryable server errors
	retryOnNetworkError: true,
	shouldRetry: undefined,
};

/**
 * Configuration options for the c15t backend client
 */
export interface C15tClientOptions {
	/**
	 * Backend URL for API endpoints. Can be absolute or relative.
	 *
	 * @default '/api/c15t'
	 */
	backendURL: string;

	/**
	 * Additional HTTP headers to include in all API requests.
	 */
	headers?: Record<string, string>;

	/**
	 * A custom fetch implementation to use instead of the global fetch.
	 */
	customFetch?: typeof fetch;

	/**
	 * Global callbacks for handling API responses.
	 */
	callbacks?: ConsentManagerCallbacks;

	/**
	 * CORS mode for fetch requests.
	 * @default 'cors'
	 */
	corsMode?: RequestMode;

	/**
	 * Global retry configuration for fetch requests.
	 * Can be overridden per request in `FetchOptions`.
	 * @default { maxRetries: 3, initialDelayMs: 100, backoffFactor: 2, retryableStatusCodes: [500, 502, 503, 504] }
	 */
	retryConfig?: RetryConfig;
}

/**
 * Regex pattern to match absolute URLs (those with a protocol like http:// or https://)
 */
const ABSOLUTE_URL_REGEX = /^(?:[a-z+]+:)?\/\//i;

/**
 * Regex pattern to remove leading slashes
 */
const LEADING_SLASHES_REGEX = /^\/+/;

/**
 * Regex pattern to remove trailing slashes
 */
const TRAILING_SLASHES_REGEX = /\/+$/;

/**
 * Helper function to introduce a delay
 * @param ms - Delay duration in milliseconds
 * @returns Promise resolving after the delay
 * @internal
 */
const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generates a UUID v4 for request identification
 *
 * @returns A randomly generated UUID string
 */
function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

/**
 * c15t backend implementation of the consent client interface.
 * Makes HTTP requests to the c15t consent management backend.
 */
export class C15tClient implements ConsentManagerInterface {
	/**
	 * Base URL for API requests (without trailing slash)
	 * @internal
	 */
	private backendURL: string;

	/**
	 * Default headers to include with all requests
	 * @internal
	 */
	private headers: Record<string, string>;

	/**
	 * Custom fetch implementation (if provided)
	 * @internal
	 */
	private customFetch?: typeof fetch;

	/**
	 * Callback functions for client events
	 * @internal
	 */
	private callbacks?: ConsentManagerCallbacks;

	/**
	 * CORS mode for fetch requests
	 * @internal
	 */
	private corsMode: RequestMode;

	/**
	 * Global retry configuration for fetch requests.
	 * @internal
	 */
	private retryConfig: RetryConfig;

	/**
	 * Creates a new c15t client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: C15tClientOptions) {
		this.backendURL = options.backendURL.endsWith('/')
			? options.backendURL.slice(0, -1)
			: options.backendURL;

		this.headers = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		this.customFetch = options.customFetch;
		this.callbacks = options.callbacks;
		this.corsMode = options.corsMode || 'cors';

		// Merge provided retry config with defaults
		this.retryConfig = {
			maxRetries:
				options.retryConfig?.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries ?? 3,
			initialDelayMs:
				options.retryConfig?.initialDelayMs ??
				DEFAULT_RETRY_CONFIG.initialDelayMs ??
				100,
			backoffFactor:
				options.retryConfig?.backoffFactor ??
				DEFAULT_RETRY_CONFIG.backoffFactor ??
				2,
			retryableStatusCodes:
				options.retryConfig?.retryableStatusCodes ??
				DEFAULT_RETRY_CONFIG.retryableStatusCodes,
			shouldRetry:
				options.retryConfig?.shouldRetry ?? DEFAULT_RETRY_CONFIG.shouldRetry,
			retryOnNetworkError:
				options.retryConfig?.retryOnNetworkError ??
				DEFAULT_RETRY_CONFIG.retryOnNetworkError,
		};

		// Check for pending consent submissions on initialization
		this.checkPendingConsentSubmissions();
	}

	/**
	 * Resolves a URL path against the backend URL, handling both absolute and relative URLs.
	 *
	 * @param backendURL - The backend URL (can be absolute or relative)
	 * @param path - The path to append
	 * @returns The resolved URL string
	 */
	private resolveUrl(backendURL: string, path: string): string {
		// Case 1: backendURL is already an absolute URL (includes protocol)
		if (ABSOLUTE_URL_REGEX.test(backendURL)) {
			const backendURLObj = new URL(backendURL);
			// Remove trailing slashes from base path and leading slashes from the path to join
			const basePath = backendURLObj.pathname.replace(
				TRAILING_SLASHES_REGEX,
				''
			);
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
	 * Returns the client's configured callbacks.
	 *
	 * @returns The callbacks object or undefined if no callbacks are configured
	 */
	getCallbacks(): ConsentManagerCallbacks | undefined {
		return this.callbacks;
	}

	/**
	 * Creates a response context object for success or error cases.
	 */
	private createResponseContext<T>(
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
		};
	}

	/**
	 * Makes an HTTP request to the API with retry logic.
	 */
	private async fetcher<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		// Determine the final retry configuration (request overrides global)
		const finalRetryConfig: RetryConfig = {
			...this.retryConfig,
			...(options?.retryConfig || {}),
			retryableStatusCodes:
				options?.retryConfig?.retryableStatusCodes ??
				this.retryConfig.retryableStatusCodes ??
				DEFAULT_RETRY_CONFIG.retryableStatusCodes,
		};

		const {
			maxRetries,
			initialDelayMs,
			backoffFactor,
			retryableStatusCodes,
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
			const fetchImpl = this.customFetch || globalThis.fetch;

			// Resolve the full URL using the resolveUrl method
			const resolvedUrl = this.resolveUrl(this.backendURL, path);
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
				mode: this.corsMode, // Use configured CORS mode
				credentials: 'include',
				headers: {
					...this.headers,
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
					const errorResponse = this.createResponseContext<ResponseType>(
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
					this.callbacks?.onError?.(errorResponse, path);

					if (options?.throw) {
						throw new Error('Failed to parse response');
					}
					return errorResponse; // Return immediately, no retry
				}

				// Determine if the request was successful
				const isSuccess = response.status >= 200 && response.status < 300;

				if (isSuccess) {
					const successResponse = this.createResponseContext<ResponseType>(
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

				const errorResponse = this.createResponseContext<ResponseType>(
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

				// Apply custom retry strategy if provided - it takes precedence over retryableStatusCodes
				if (typeof finalRetryConfig.shouldRetry === 'function') {
					try {
						shouldRetryThisRequest = finalRetryConfig.shouldRetry(response, {
							attemptsMade,
							url: url.toString(),
							method: requestOptions.method || 'GET',
						});
					} catch {
						// Fall back to status code check if custom function throws
						shouldRetryThisRequest =
							retryableStatusCodes?.includes(response.status) ?? false;
					}
				} else {
					// Fall back to retryableStatusCodes if no custom strategy
					shouldRetryThisRequest =
						retryableStatusCodes?.includes(response.status) ?? false;
				}

				// Don't retry if we've already made maximum attempts
				if (!shouldRetryThisRequest || attemptsMade >= (maxRetries ?? 0)) {
					// Don't retry - call callbacks and potentially throw
					options?.onError?.(errorResponse, path);
					this.callbacks?.onError?.(errorResponse, path);

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
				const errorResponse = this.createResponseContext<ResponseType>(
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
					this.callbacks?.onError?.(errorResponse, path);

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
			this.createResponseContext<ResponseType>(
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
		this.callbacks?.onError?.(maxRetriesErrorResponse, path);

		if (options?.throw) {
			throw new Error(`Request failed after ${maxRetries} retries`);
		}

		return maxRetriesErrorResponse;
	}

	/**
	 * Checks if a consent banner should be shown.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		try {
			// First try to make the actual API request
			const response = await this.fetcher<ShowConsentBannerResponse>(
				API_ENDPOINTS.SHOW_CONSENT_BANNER,
				{
					method: 'GET',
					...options,
				}
			);

			// If the request was successful or if we're in a test environment, return the actual response
			if (response.ok || options?.testing) {
				return response;
			}

			// If we got here, the request failed but didn't throw - fall back to offline mode
			console.warn(
				'API request failed, falling back to offline mode for consent banner'
			);
			return this.offlineFallbackForConsentBanner(options);
		} catch (error) {
			// If in a test environment or if fallback is disabled, propagate the error
			if (options?.testing || options?.disableFallback) {
				// Create an error response to match what would normally happen
				const errorResponse =
					this.createResponseContext<ShowConsentBannerResponse>(
						false,
						null,
						{
							message: error instanceof Error ? error.message : String(error),
							status: 0,
							code: 'NETWORK_ERROR',
							cause: error,
						},
						null
					);

				if (options?.onError) {
					await options.onError(
						errorResponse,
						API_ENDPOINTS.SHOW_CONSENT_BANNER
					);
				}

				return errorResponse;
			}

			// If an error was thrown, also fall back to offline mode
			console.warn(
				'Error fetching consent banner info, falling back to offline mode:',
				error
			);
			return this.offlineFallbackForConsentBanner(options);
		}
	}

	/**
	 * Provides offline mode fallback for showConsentBanner API.
	 * Simulates the behavior of OfflineClient when API requests fail.
	 * @internal
	 */
	private async offlineFallbackForConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		// Check localStorage to see if the banner has been shown
		let shouldShow = true;
		let hasLocalStorageAccess = false;
		const localStorageKey = 'c15t-consent';

		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				// Test localStorage access with a simple operation
				window.localStorage.setItem('c15t-storage-test-key', 'test');
				window.localStorage.removeItem('c15t-storage-test-key');
				hasLocalStorageAccess = true;

				const storedConsent = window.localStorage.getItem(localStorageKey);
				shouldShow = storedConsent === null;
			}
		} catch (error) {
			// Ignore localStorage errors (e.g., in environments where it's blocked)
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.warn('Failed to access localStorage in offline fallback:', error);
			// Default to not showing if localStorage isn't available to prevent memory leaks
			shouldShow = false;
		}

		// Create a simulated response similar to what the API would return
		const response = this.createResponseContext<ShowConsentBannerResponse>(
			true, // Mark as successful even though we're in fallback mode
			{
				showConsentBanner: shouldShow && hasLocalStorageAccess,
				jurisdiction: {
					code: 'UNKNOWN', // We don't know the jurisdiction in offline mode
					message: 'Unknown (offline mode)',
				},
				location: {
					countryCode: 'XX', // Use placeholder values
					regionCode: null,
				},
			},
			null,
			null
		);

		// Call success callback if provided
		if (options?.onSuccess) {
			await options.onSuccess(response);
		}

		return response;
	}

	/**
	 * Sets consent preferences for a subject.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		try {
			// First try the actual API request
			const response = await this.fetcher<
				SetConsentResponse,
				SetConsentRequestBody
			>(API_ENDPOINTS.SET_CONSENT, {
				method: 'POST',
				...options,
			});

			// If the request was successful or if we're in a test environment, return the actual response
			if (response.ok || options?.testing) {
				return response;
			}

			// If we got here, the request failed but didn't throw - fall back to offline mode
			console.warn(
				'API request failed, falling back to offline mode for setting consent'
			);
			return this.offlineFallbackForSetConsent(options);
		} catch (error) {
			// If in a test environment or if fallback is disabled, propagate the error
			if (options?.testing || options?.disableFallback) {
				// Create an error response to match what would normally happen
				const errorResponse = this.createResponseContext<SetConsentResponse>(
					false,
					null,
					{
						message: error instanceof Error ? error.message : String(error),
						status: 0,
						code: 'NETWORK_ERROR',
						cause: error,
					},
					null
				);

				if (options?.onError) {
					await options.onError(errorResponse, API_ENDPOINTS.SET_CONSENT);
				}

				return errorResponse;
			}

			// If an error was thrown, also fall back to offline mode
			console.warn(
				'Error setting consent, falling back to offline mode:',
				error
			);
			return this.offlineFallbackForSetConsent(options);
		}
	}

	/**
	 * Provides offline mode fallback for setConsent API.
	 * Simulates the behavior of OfflineClient when API requests fail.
	 * @internal
	 */
	private async offlineFallbackForSetConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		const localStorageKey = 'c15t-consent';
		const pendingSubmissionsKey = 'c15t-pending-consent-submissions';

		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				// Test localStorage access with a simple operation
				window.localStorage.setItem('c15t-storage-test-key', 'test');
				window.localStorage.removeItem('c15t-storage-test-key');

				// Store the consent preferences locally
				window.localStorage.setItem(
					localStorageKey,
					JSON.stringify({
						timestamp: new Date().toISOString(),
						preferences: options?.body?.preferences || {},
					})
				);

				// Store the submission in the pending queue for retry on next page load
				if (options?.body) {
					let pendingSubmissions: SetConsentRequestBody[] = [];

					try {
						const storedSubmissions = window.localStorage.getItem(
							pendingSubmissionsKey
						);
						if (storedSubmissions) {
							pendingSubmissions = JSON.parse(storedSubmissions);
						}
					} catch (e) {
						// If there's an error parsing existing submissions, start fresh
						// biome-ignore lint/suspicious/noConsole: <explanation>
						console.warn('Error parsing pending submissions:', e);
						pendingSubmissions = [];
					}

					// Add this submission to the queue if not already present
					// We identify duplicates by checking preference values
					const newSubmission = options.body;
					const isDuplicate = pendingSubmissions.some(
						(submission) =>
							JSON.stringify(submission.preferences) ===
							JSON.stringify(newSubmission.preferences)
					);

					if (!isDuplicate) {
						pendingSubmissions.push(newSubmission);
						window.localStorage.setItem(
							pendingSubmissionsKey,
							JSON.stringify(pendingSubmissions)
						);
						// biome-ignore lint/suspicious/noConsole: <explanation>
						// biome-ignore lint/suspicious/noConsoleLog: <explanation>
						console.log(
							'Queued consent submission for retry on next page load'
						);
					}
				}
			}
		} catch (error) {
			// Ignore localStorage errors but log them
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.warn(
				'Failed to write to localStorage in offline fallback:',
				error
			);
		}

		// Create a success response even if we couldn't save to localStorage
		// This prevents UI errors and allows the flow to continue
		const response = this.createResponseContext<SetConsentResponse>(
			true,
			null,
			null,
			null
		);

		// Call success callback if provided
		if (options?.onSuccess) {
			await options.onSuccess(response);
		}

		return response;
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		return await this.fetcher<VerifyConsentResponse, VerifyConsentRequestBody>(
			API_ENDPOINTS.VERIFY_CONSENT,
			{
				method: 'POST',
				...options,
			}
		);
	}

	/**
	 * Makes a custom API request to any endpoint.
	 */
	async $fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		return await this.fetcher<ResponseType, BodyType, QueryType>(path, options);
	}

	/**
	 * Check for pending consent submissions on initialization
	 * @internal
	 */
	private checkPendingConsentSubmissions() {
		const pendingSubmissionsKey = 'c15t-pending-consent-submissions';

		// Don't attempt to access localStorage in SSR context
		if (typeof window === 'undefined' || !window.localStorage) {
			return;
		}

		try {
			// Test localStorage access first
			window.localStorage.setItem('c15t-storage-test-key', 'test');
			window.localStorage.removeItem('c15t-storage-test-key');

			const pendingSubmissionsStr = window.localStorage.getItem(
				pendingSubmissionsKey
			);
			if (!pendingSubmissionsStr) {
				return; // No pending submissions
			}

			const pendingSubmissions: SetConsentRequestBody[] = JSON.parse(
				pendingSubmissionsStr
			);
			if (!pendingSubmissions.length) {
				// Clean up empty array
				window.localStorage.removeItem(pendingSubmissionsKey);
				return;
			}

			// biome-ignore lint/suspicious/noConsole: <explanation>
			// biome-ignore lint/suspicious/noConsoleLog: <explanation>
			console.log(
				`Found ${pendingSubmissions.length} pending consent submission(s) to retry`
			);

			// Process submissions asynchronously to avoid blocking page load
			setTimeout(() => {
				this.processPendingSubmissions(pendingSubmissions);
			}, 2000); // Delay to ensure page is loaded and network is likely available
		} catch (error) {
			// Ignore localStorage errors but log them
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.warn('Failed to check for pending consent submissions:', error);
		}
	}

	/**
	 * Process pending consent submissions
	 * @internal
	 */
	private async processPendingSubmissions(
		submissions: SetConsentRequestBody[]
	) {
		const pendingSubmissionsKey = 'c15t-pending-consent-submissions';
		const maxRetries = 3;
		const remainingSubmissions = [...submissions];

		for (let i = 0; i < maxRetries && remainingSubmissions.length > 0; i++) {
			// Try to send each pending submission
			const successfulSubmissions: number[] = [];

			for (let j = 0; j < remainingSubmissions.length; j++) {
				const submission = remainingSubmissions[j];
				try {
					// biome-ignore lint/suspicious/noConsole: <explanation>
					// biome-ignore lint/suspicious/noConsoleLog: <explanation>
					console.log('Retrying consent submission:', submission);

					// Use the actual API endpoint, not our offlineFallback
					const response = await this.fetcher<
						SetConsentResponse,
						SetConsentRequestBody
					>(API_ENDPOINTS.SET_CONSENT, {
						method: 'POST',
						body: submission,
					});

					if (response.ok) {
						// biome-ignore lint/suspicious/noConsole: <explanation>
						// biome-ignore lint/suspicious/noConsoleLog: <explanation>
						console.log('Successfully resubmitted consent');
						successfulSubmissions.push(j);
					}
				} catch (error) {
					// biome-ignore lint/suspicious/noConsole: <explanation>
					console.warn('Failed to resend consent submission:', error);
					// Continue with the next submission
				}
			}

			// Remove successful submissions from the list (in reverse order to not affect indices)
			for (let k = successfulSubmissions.length - 1; k >= 0; k--) {
				const index = successfulSubmissions[k];
				if (index !== undefined) {
					remainingSubmissions.splice(index, 1);
				}
			}

			// If we've processed all submissions, exit the loop
			if (remainingSubmissions.length === 0) {
				break;
			}

			// Wait before retrying again
			if (i < maxRetries - 1) {
				await delay(1000 * (i + 1)); // Increasing delay between retries
			}
		}

		// Update storage with remaining submissions (if any)
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				if (remainingSubmissions.length > 0) {
					window.localStorage.setItem(
						pendingSubmissionsKey,
						JSON.stringify(remainingSubmissions)
					);
					// biome-ignore lint/suspicious/noConsole: <explanation>
					// biome-ignore lint/suspicious/noConsoleLog: <explanation>
					console.log(
						`${remainingSubmissions.length} consent submissions still pending for future retry`
					);
				} else {
					// All submissions processed, clear the storage
					window.localStorage.removeItem(pendingSubmissionsKey);
					// biome-ignore lint/suspicious/noConsole: <explanation>
					// biome-ignore lint/suspicious/noConsoleLog: <explanation>
					console.log('All pending consent submissions processed successfully');
				}
			}
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.warn('Error updating pending submissions storage:', error);
		}
	}
}
