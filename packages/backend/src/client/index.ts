import type { ConsentPurpose } from '~/schema/consent-purpose';
import type { FetchOptions, ResponseContext, c15tClientOptions } from './types';

/**
 * Client for interacting with the c15t consent management API.
 *
 * This class provides methods for retrieving and updating consent preferences,
 * listing consent purposes, and accessing consent history. It handles HTTP requests
 * to the c15t API and provides a type-safe interface for working with consent data.
 *
 * @remarks
 * The client abstracts away the details of making HTTP requests to the c15t API,
 * handling authentication, error handling, and response parsing. It provides
 * a clean, type-safe interface for working with consent data.
 *
 * @example
 * ```typescript
 * import { createConsentClient } from '@c15t/client';
 *
 * const client = createConsentClient({
 *   baseURL: 'https://example.com/api',
 *   headers: { 'X-API-Key': 'your-api-key' }
 * });
 *
 * // Get current consent
 * const { data, error } = await client.getConsent();
 *
 * // Update consent
 * await client.updateConsent({
 *   analytics: true,
 *   marketing: false
 * });
 * ```
 */
export class c15tClient {
	/**
	 * Base URL for API requests (without trailing slash)
	 *
	 * @internal
	 */
	private baseURL: string;

	/**
	 * Default headers to include with all requests
	 *
	 * @internal
	 */
	private headers: Record<string, string>;

	/**
	 * Custom fetch implementation (if provided)
	 *
	 * @internal
	 */
	private customFetch?: typeof fetch;

	/**
	 * Creates a new c15t client instance.
	 *
	 * @param options - Configuration options for the client
	 * @throws Will throw an error if the baseURL is invalid or if required options are missing
	 */
	constructor(options: c15tClientOptions) {
		this.baseURL = options.baseURL.endsWith('/')
			? options.baseURL.slice(0, -1)
			: options.baseURL;

		this.headers = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		this.customFetch = options.fetchOptions?.customFetchImpl;
	}

	/**
	 * Generic method for making HTTP requests to the API.
	 *
	 * This internal method handles constructing the request, processing the response,
	 * and executing any callbacks based on the response status. It provides standardized
	 * error handling and response formatting.
	 *
	 * @typeParam ResponseType - The expected type of the response data
	 * @param path - API endpoint path (will be appended to the baseURL)
	 * @param options - Request configuration options
	 * @returns A response context object containing the data, response metadata, and any errors
	 * @throws Will throw an error if options.throw is true and the request fails
	 * @internal This method is not intended to be used directly, use the public API methods instead
	 */
	private async fetcher<ResponseType>(
		path: string,
		options: FetchOptions<ResponseType> = {}
	): Promise<ResponseContext<ResponseType>> {
		try {
			const url = new URL(path, this.baseURL);

			// Add query parameters
			if (options.query) {
				for (const [key, value] of Object.entries(options.query)) {
					if (value !== undefined) {
						if (Array.isArray(value)) {
							for (const v of value) {
								url.searchParams.append(key, String(v));
							}
						} else {
							url.searchParams.append(key, String(value));
						}
					}
				}
			}

			const fetchOptions: RequestInit = {
				method: options.method || 'GET',
				headers: {
					...this.headers,
					...options.headers,
				},
			};

			// Add body for non-GET requests
			if (options.body && fetchOptions.method !== 'GET') {
				fetchOptions.body = JSON.stringify(options.body);
			}

			// Use custom fetch if provided, otherwise use global fetch
			const fetchImpl = this.customFetch || fetch;
			const response = await fetchImpl(url.toString(), fetchOptions);

			let data: ResponseType | null = null;
			let error: Error | null = null;

			// Parse response data
			if (response.status !== 204) {
				try {
					data = await response.json();
				} catch (err) {
					if (response.ok) {
						data = null;
					} else {
						error = new Error(
							`Failed to parse response: ${(err as Error).message}`
						);
					}
				}
			}

			// Create context object
			const context: ResponseContext<ResponseType> = {
				data,
				response,
				error: error
					? {
							message: error.message,
							status: response.status,
						}
					: null,
				ok: response.ok,
			};

			// Handle callbacks
			if (response.ok) {
				if (options.onSuccess) {
					await options.onSuccess(context);
				}
			} else {
				if (options.onError) {
					await options.onError(context);
				}

				// Throw error if requested
				if (options.throw) {
					const error = new Error(
						`Request failed with status ${response.status}`
					);
					Object.assign(error, { status: response.status, data });
					throw error;
				}
			}

			return context;
		} catch (error: unknown) {
			if (options.onError) {
				const errorObj = error as Error;
				const context: ResponseContext<ResponseType> = {
					data: null,
					error: {
						message: errorObj.message || 'Request failed',
						status: (error as { status?: number }).status || 500,
						code: (error as { code?: string }).code,
					},
					ok: false,
					response: null,
				};

				await options.onError(context);

				if (options.throw) {
					throw error;
				}

				return context;
			}

			if (options.throw) {
				throw error;
			}

			return {
				data: null,
				error: {
					message: (error as Error).message || 'Request failed',
					status: (error as { status?: number }).status || 500,
					code: (error as { code?: string }).code,
				},
				ok: false,
				response: null,
			};
		}
	}

	// /**
	//  * Retrieves the current consent preferences.
	//  *
	//  * This method fetches the current consent settings for the subject,
	//  * including which purposes they have consented to and when the
	//  * consent was last updated.
	//  *
	//  * @example
	//  * ```typescript
	//  * const { data, error } = await client.getConsent();
	//  *
	//  * if (data) {
	//  *   console.log('Subject consented to analytics:', data.preferences.analytics);
	//  *   console.log('Consent last updated:', data.updatedAt);
	//  * }
	//  * ```
	//  *
	//  * @param options - Optional fetch configuration options
	//  * @returns Response context containing the consent preferences if successful
	//  */
	// async getConsent(
	// 	options?: FetchOptions<ConsentPreference>
	// ): Promise<ResponseContext<ConsentPreference>> {
	// 	return this.fetcher<ConsentPreference>('/get-consent', {
	// 		method: 'GET',
	// 		...options,
	// 	});
	// }

	/**
	 * Lists all available consent purposes.
	 *
	 * This method retrieves all consent purposes configured in the system,
	 * including their IDs, names, descriptions, and whether they are required
	 * or optional.
	 *
	 * @throws Will throw an error if options.throw is true and the request fails
	 *
	 * @example
	 * ```typescript
	 * const { data, error } = await client.listPurposes();
	 *
	 * if (error) {
	 *   console.error('Failed to fetch purposes:', error.message);
	 *   return;
	 * }
	 *
	 * if (data) {
	 *   // Display available consent purposes to the subject
	 *   data.forEach(consentPurpose => {
	 *     console.log(`${consentPurpose.name}: ${consentPurpose.description}`);
	 *     console.log(`Required: ${consentPurpose.required}`);
	 *   });
	 * }
	 * ```
	 *
	 * @param options - Optional fetch configuration options
	 * @returns Response context containing the list of consent purposes if successful
	 */
	async listPurposes(
		options?: FetchOptions<ConsentPurpose[]>
	): Promise<ResponseContext<ConsentPurpose[]>> {
		return this.fetcher<ConsentPurpose[]>('/list-purposes', {
			method: 'GET',
			...options,
		});
	}

	// /**
	//  * Updates the subject's consent preferences.
	//  *
	//  * This method sends the subject's updated consent choices to the server,
	//  * recording which purposes they have agreed to and which they have declined.
	//  *
	//  * @example
	//  * ```typescript
	//  * const { data, error } = await client.updateConsent({
	//  *   analytics: true,
	//  *   marketing: false,
	//  *   preferences: true
	//  * });
	//  *
	//  * if (data) {
	//  *   console.log('Consent updated successfully');
	//  *   console.log('New preferences:', data.preferences);
	//  * }
	//  * ```
	//  *
	//  * @param preferences - Record mapping consentPurpose IDs to boolean consent values
	//  * @param options - Optional fetch configuration options
	//  * @returns Response context containing the updated consent preferences if successful
	//  */
	// async updateConsent(
	// 	preferences: Record<string, boolean>,
	// 	options?: FetchOptions<ConsentPreference>
	// ): Promise<ResponseContext<ConsentPreference>> {
	// 	return this.fetcher<ConsentPreference>('/update-consent', {
	// 		method: 'POST',
	// 		body: { preferences },
	// 		...options,
	// 	});
	// }

	// /**
	//  * Retrieves the history of consent changes.
	//  *
	//  * This method fetches a chronological record of consent preference changes,
	//  * showing when and how consent settings were modified.
	//  *
	//  * @example
	//  * ```typescript
	//  * // Get consent history for a specific subject
	//  * const { data } = await client.getConsentHistory({
	//  *   subjectId: 'sub_x1pftyoufsm7xgo1kv',
	//  *   limit: 10
	//  * });
	//  *
	//  * if (data) {
	//  *   data.forEach(event => {
	//  *     console.log(`Change at ${event.timestamp}`);
	//  *     console.log(`Changed purposes: ${Object.keys(event.changes).join(', ')}`);
	//  *   });
	//  * }
	//  * ```
	//  *
	//  * @param query - Query parameters to filter the history results
	//  * @param options - Optional fetch configuration options
	//  * @returns Response context containing the list of consent change events if successful
	//  */
	// async getConsentHistory(
	// 	query?: {
	// 		recordId?: string;
	// 		subjectId?: string;
	// 		deviceId?: string;
	// 		limit?: number;
	// 		offset?: number;
	// 	},
	// 	options?: FetchOptions<ConsentChangeEvent[]>
	// ): Promise<ResponseContext<ConsentChangeEvent[]>> {
	// 	return this.fetcher<ConsentChangeEvent[]>('/consent-history', {
	// 		method: 'GET',
	// 		query,
	// 		...options,
	// 	});
	// }

	/**
	 * Makes a custom API request to any endpoint.
	 *
	 * This method allows for making requests to custom endpoints not covered
	 * by the standard methods, such as plugin-specific endpoints.
	 *
	 * @typeParam ResponseType - The expected type of the response data
	 * @param path - The API endpoint path
	 * @param options - Request configuration options
	 * @returns Response context containing the requested data if successful
	 * @throws Will throw an error if options.throw is true and the request fails
	 *
	 * @example
	 * ```typescript
	 * // Call a custom analytics endpoint with error handling
	 * try {
	 *   const { data, error } = await client.$fetch<AnalyticsResponse>('/analytics/track', {
	 *     method: 'POST',
	 *     body: {
	 *       event: 'page_view',
	 *       properties: { page: '/home' }
	 *     },
	 *     throw: true // Automatically throw on error
	 *   });
	 *
	 *   console.log('Event tracked successfully:', data);
	 * } catch (error) {
	 *   console.error('Failed to track event:', error);
	 * }
	 *
	 * // Using callbacks for success/error handling
	 * await client.$fetch('/analytics/track', {
	 *   method: 'POST',
	 *   body: { event: 'button_click' },
	 *   onSuccess: ({ data }) => console.log('Tracked:', data),
	 *   onError: ({ error }) => console.error('Failed:', error.message)
	 * });
	 * ```
	 */
	async $fetch<ResponseType>(
		path: string,
		options?: FetchOptions<ResponseType>
	): Promise<ResponseContext<ResponseType>> {
		return this.fetcher<ResponseType>(path, options);
	}
}

/**
 * Creates and returns a new c15t client instance.
 *
 * This is the recommended way to create a client for interacting with the c15t API.
 * It provides a convenient factory function that instantiates a properly configured
 * client based on the provided options.
 *
 * @throws Will throw an error if the baseURL is invalid or if required options are missing
 *
 * @example
 * ```typescript
 * import { createConsentClient } from '@c15t/client';
 *
 * // Create a client for your application
 * const client = createConsentClient({
 *   baseURL: 'https://api.example.com/consent',
 *   headers: {
 *     'X-API-Key': process.env.API_KEY,
 *     'user-agent': 'MyConsentApp/1.0'
 *   },
 *   fetchOptions: {
 *     // Optional custom fetch implementation
 *     customFetchImpl: customFetch
 *   }
 * });
 *
 * // Use the client in your application
 * async function handleConsentFlow() {
 *   // Get available purposes
 *   const { data: purposes, error } = await client.listPurposes();
 *
 *   if (error) {
 *     console.error('Failed to load consent purposes:', error.message);
 *     return;
 *   }
 *
 *   // Display purposes to subject and collect their choices
 *   // ...
 *
 *   // Then update their consent
 *   const userChoices = {
 *     analytics: true,
 *     marketing: false
 *   };
 *
 *   await client.$fetch('/update-consent', {
 *     method: 'POST',
 *     body: { preferences: userChoices }
 *   });
 * }
 * ```
 *
 * @param options - Configuration options for the client
 * @returns A new c15tClient instance
 */
export function createConsentClient(options: c15tClientOptions): c15tClient {
	return new c15tClient(options);
}
