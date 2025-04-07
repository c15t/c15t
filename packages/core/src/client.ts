import type { FetchOptions, ResponseContext, c15tClientOptions } from './types';

import type {
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '@c15t/backend';

/**
 * Default consent banner API URL
 */
const DEFAULT_API_BASE_URL = '/api/c15t';

/**
 * Regex pattern to detect absolute URLs (with protocol)
 */
const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

/**
 * Regex pattern to remove trailing slashes
 */
const TRAILING_SLASHES_REGEX = /\/+$/;

/**
 * Regex pattern to remove leading slashes
 */
const LEADING_SLASHES_REGEX = /^\/+/;

/**
 * API endpoint paths
 */
const API_ENDPOINTS = {
	/**
	 * Path for the consent banner information endpoint
	 */
	SHOW_CONSENT_BANNER: '/show-consent-banner',

	/**
	 * Path for listing consent purposes
	 */
	LIST_PURPOSES: '/list-purposes',

	/**
	 * Path for setting consent
	 */
	SET_CONSENT: '/consent/set',

	/**
	 * Path for verifying consent
	 */
	VERIFY_CONSENT: '/consent/verify',
};

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
 * import { createConsentClient } from '@c15t/core';
 *
 * const client = createConsentClient({
 *   backendURL: 'https://example.com/api',
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
	private backendURL: string;

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
	 * @throws Will throw an error if the backendURL is invalid or if required options are missing
	 */
	constructor(options: c15tClientOptions) {
		this.backendURL = options.backendURL.endsWith('/')
			? options.backendURL.slice(0, -1)
			: options.backendURL;

		this.headers = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		this.customFetch = options.fetchOptions?.customFetchImpl;
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
	 * Generic method for making HTTP requests to the API.
	 *
	 * This internal method handles constructing the request, processing the response,
	 * and executing any callbacks based on the response status. It provides standardized
	 * error handling and response formatting.
	 *
	 * @typeParam ResponseType - The expected type of the response data
	 * @param path - API endpoint path (will be appended to the backendURL)
	 * @param options - Request configuration options
	 * @returns A response context object containing the data, response metadata, and any errors
	 * @throws Will throw an error if options.throw is true and the request fails
	 * @internal This method is not intended to be used directly, use the public API methods instead
	 */
	private async fetcher<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options: FetchOptions<ResponseType, BodyType, QueryType> = {}
	): Promise<ResponseContext<ResponseType>> {
		try {
			// Use the resolveUrl method instead of direct URL construction
			const urlString = this.resolveUrl(this.backendURL, path);

			// Create URL object for search params (this should work even with relative URLs
			// since we're creating it in the browser context)
			const url = new URL(
				urlString,
				typeof window !== 'undefined'
					? window.location.href
					: 'http://localhost'
			);

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
				mode: 'cors',
				// credentials: 'include', // Include cookies in requests
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
	async $fetch<ResponseType, BodyType, QueryType>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		return this.fetcher<ResponseType, BodyType, QueryType>(path, options);
	}

	/**
	 * Checks if a consent banner should be shown based on the user's location.
	 *
	 * This method determines whether a consent banner should be displayed
	 * based on the user's location and applicable privacy regulations.
	 *
	 * @example
	 * ```typescript
	 * const { data, error } = await client.showConsentBanner();
	 *
	 * if (data) {
	 *   if (data.showConsentBanner) {
	 *     console.log(`Banner required due to ${data.jurisdiction.code}: ${data.jurisdiction.message}`);
	 *     console.log(`User location: ${data.location.countryCode}`);
	 *     showConsentBanner();
	 *   } else {
	 *     console.log('No consent banner required in this jurisdiction');
	 *   }
	 * }
	 * ```
	 *
	 * @param options - Optional fetch configuration options
	 * @returns Response context containing the consent banner information if successful
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		return this.fetcher<ShowConsentBannerResponse>(
			API_ENDPOINTS.SHOW_CONSENT_BANNER,
			{
				method: 'GET',
				...options,
			}
		);
	}

	/**
	 * Sets consent preferences for a subject.
	 *
	 * This method allows setting different types of consent including cookie preferences,
	 * privacy policy acceptance, marketing preferences, etc.
	 *
	 * @example
	 * ```typescript
	 * // Set cookie banner preferences
	 * const { data } = await client.setConsent({
	 *   type: 'cookie_banner',
	 *   domain: 'example.com',
	 *   preferences: {
	 *     analytics: true,
	 *     marketing: false,
	 *     necessary: true
	 *   }
	 * });
	 *
	 * // Accept privacy policy
	 * const { data } = await client.setConsent({
	 *   type: 'privacy_policy',
	 *   domain: 'example.com',
	 *   policyId: 'pol_xyz789',
	 *   metadata: {
	 *     source: 'account_creation',
	 *     acceptanceMethod: 'checkbox'
	 *   }
	 * });
	 * ```
	 *
	 * @param request - The consent request data
	 * @param options - Optional fetch configuration
	 * @returns Response containing the created consent record
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return this.fetcher<SetConsentResponse, SetConsentRequestBody>(
			API_ENDPOINTS.SET_CONSENT,
			{
				method: 'POST',
				...options,
			}
		);
	}

	/**
	 * Verifies if valid consent exists for a given subject, domain, and consent type.
	 *
	 * This method checks if the subject has given valid consent for specific purposes
	 * or policies. It can verify both cookie banner consent and policy-based consent.
	 *
	 * @example
	 * ```typescript
	 * // Verify cookie banner consent
	 * const { data } = await client.verifyConsent({
	 *   type: 'cookie_banner',
	 *   domain: 'example.com',
	 *   preferences: ['marketing', 'analytics']
	 * });
	 *
	 * if (data?.isValid) {
	 *   console.log('Consent is valid');
	 * } else {
	 *   console.log('Consent is invalid:', data?.reasons);
	 * }
	 *
	 * // Verify privacy policy consent
	 * const { data } = await client.verifyConsent({
	 *   type: 'privacy_policy',
	 *   domain: 'example.com',
	 *   policyId: 'pol_xyz789'
	 * });
	 * ```
	 *
	 * @param request - The verify consent request data
	 * @param options - Optional fetch configuration
	 * @returns Response indicating if the consent is valid and any failure reasons
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		return this.fetcher<VerifyConsentResponse, VerifyConsentRequestBody>(
			API_ENDPOINTS.VERIFY_CONSENT,
			{
				method: 'POST',
				...options,
			}
		);
	}
}

/**
 * Creates and returns a new c15t client instance.
 *
 * This is the recommended way to create a client for interacting with the c15t API.
 * It provides a convenient factory function that instantiates a properly configured
 * client based on the provided options.
 *
 * @throws Will throw an error if the backendURL is invalid or if required options are missing
 *
 * @example
 * ```typescript
 * import { createConsentClient } from '@c15t/core';
 *
 * // Create a client for your application
 * const client = createConsentClient({
 *   backendURL: 'https://api.example.com/consent',
 *   fetchOptions: {
 *     // Optional custom fetch implementation
 *     customFetchImpl: customFetch
 *   }
 * });
 * ```
 *
 * @param options - Configuration options for the client
 * @returns A new c15tClient instance
 */
export function createConsentClient(options: c15tClientOptions): c15tClient {
	// If no backendURL provided, use the default
	const clientOptions = {
		...options,
		backendURL: options.backendURL || DEFAULT_API_BASE_URL,
	};

	return new c15tClient(clientOptions);
}
