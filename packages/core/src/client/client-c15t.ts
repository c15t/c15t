/**
 * C15t backend implementation of the consent client interface.
 * This client makes HTTP requests to the c15t consent management backend.
 *
 * When `backendURL` is set to `false`, the client enters disabled mode,
 * where all API methods return successful empty responses without making
 * network requests. This is useful for implementing offline mode or for
 * testing without requiring complex mocks.
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
} from './types';

/**
 * Configuration options for the C15t backend client
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
}

/**
 * Regex pattern to remove leading slashes
 */
const LEADING_SLASHES_REGEX = /^\/+/;

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
 * C15t backend implementation of the consent client interface.
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
	 * Creates a new C15t client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: C15tClientOptions) {
		let backendUrl = options.backendURL;
		if (backendUrl.endsWith('/')) {
			backendUrl = backendUrl.slice(0, -1);
		}
		this.backendURL = backendUrl;

		this.headers = {
			'Content-Type': 'application/json',
			...options.headers,
		};

		this.customFetch = options.customFetch;
		this.callbacks = options.callbacks;
		this.corsMode = options.corsMode || 'cors';
	}

	/**
	 * Checks if the client is in disabled mode.
	 * C15t client is never disabled.
	 *
	 * @returns Always returns false
	 */
	isDisabled(): boolean {
		return this.backendURL === false;
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
	 * Makes an HTTP request to the API.
	 */
	private async fetcher<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		// Prepare URL and request options
		const url = new URL(
			`${this.backendURL}/${path.replace(LEADING_SLASHES_REGEX, '')}`
		);

		// Add query parameters
		if (options?.query) {
			for (const [key, value] of Object.entries(options.query)) {
				if (value !== undefined) {
					url.searchParams.append(key, String(value));
				}
			}
		}

		const requestId = generateUUID();
		const fetchImpl = this.customFetch || globalThis.fetch;

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
					response.status !== 204 &&
					response.headers.get('content-length') !== '0'
				) {
					data = await response.json();
				}
			} catch (err) {
				parseError = err;
			}

			// Handle parse errors
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

				return errorResponse;
			}

			// Determine if the request was successful
			const isSuccess = response.status >= 200 && response.status < 300;

			if (isSuccess) {
				const successResponse = this.createResponseContext<ResponseType>(
					true,
					data as ResponseType,
					null,
					response
				);

				options?.onSuccess?.(successResponse);
				return successResponse;
			}
			const errorData = data as {
				message: string;
				code: string;
				details: Record<string, unknown> | null;
			};
			const errorResponse = this.createResponseContext<ResponseType>(
				false,
				null,
				{
					message: errorData?.message || 'Request failed',
					status: response.status,
					code: errorData?.code || 'API_ERROR',
					details: errorData?.details || null,
				},
				response
			);

			options?.onError?.(errorResponse, path);
			this.callbacks?.onError?.(errorResponse, path);

			if (options?.throw) {
				throw new Error(errorResponse.error?.message || 'Request failed');
			}

			return errorResponse;
		} catch (fetchError) {
			// Handle network/request errors
			if (
				!fetchError ||
				(fetchError as Error).message === 'Failed to parse response'
			) {
				throw fetchError;
			}

			const errorResponse = this.createResponseContext<ResponseType>(
				false,
				null,
				{
					message:
						fetchError instanceof Error
							? fetchError.message
							: String(fetchError),
					status: 0,
					code: 'NETWORK_ERROR',
					cause: fetchError,
				},
				null
			);

			options?.onError?.(errorResponse, path);
			this.callbacks?.onError?.(errorResponse, path);

			if (options?.throw) {
				throw fetchError;
			}

			return errorResponse;
		}
	}

	/**
	 * Checks if a consent banner should be shown.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		return await this.fetcher<ShowConsentBannerResponse>(
			API_ENDPOINTS.SHOW_CONSENT_BANNER,
			{
				method: 'GET',
				...options,
			}
		);
	}

	/**
	 * Sets consent preferences for a subject.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return await this.fetcher<SetConsentResponse, SetConsentRequestBody>(
			API_ENDPOINTS.SET_CONSENT,
			{
				method: 'POST',
				...options,
			}
		);
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
}
