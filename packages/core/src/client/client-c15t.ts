/**
 * c15t backend implementation of the consent client interface.
 * This client makes HTTP requests to the c15t consent management backend.
 */

import type { router } from '@c15t/orpc-router/router';
import type {
	ConsentManagerCallbacks,
	ConsentManagerInterface,
	SetConsentRequest,
	SetConsentResponse,
	ShowBannerResponse,
	VerifyConsentRequest,
	VerifyConsentResponse,
} from './client-interface';

import type { FetchOptions, ResponseContext, RetryConfig } from './types';

import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { RouterClient } from '@orpc/server';
import { createResponseContext } from './utils';

/**
 * Type definitions for ORPC router and methods
 * @internal
 */
type ConsentRouter = RouterClient<typeof router>['consent'];
type ConsentMethod = keyof ConsentRouter;

/**
 * Type utilities for ORPC method handling
 * @internal
 */
type MethodReturnType<T extends ConsentMethod> = ReturnType<ConsentRouter[T]>;
type MethodParams<T extends ConsentMethod> = Parameters<ConsentRouter[T]>[0];
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

/**
 * Type utilities for request handling
 * @internal
 */
type RequestParams<T> = T extends { body?: infer B } ? B : never;
type RequestResponse<T> = T extends { response: infer R } ? R : never;

/**
 * Type mapping utilities for ORPC client
 * @internal
 */
type MethodParamMap = {
	showBanner: Parameters<ConsentRouter['showBanner']>[0];
	post: Parameters<ConsentRouter['post']>[0];
	verify: Parameters<ConsentRouter['verify']>[0];
};

type MethodResponseMap = {
	showBanner: Awaited<ReturnType<ConsentRouter['showBanner']>>;
	post: Awaited<ReturnType<ConsentRouter['post']>>;
	verify: Awaited<ReturnType<ConsentRouter['verify']>>;
};

/**
 * Default retry configuration
 * @internal
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3, // Setting to 0 will still allow the initial request but no retries
	initialDelayMs: 100,
	backoffFactor: 2,
	retryableStatusCodes: [500, 502, 503, 504], // Default retryable server errors
	nonRetryableStatusCodes: [400, 401, 403, 404], // Never retry client errors, especially 404
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
	 * @default '/rpc'
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
	 * ORPC client for making requests
	 * @internal
	 */
	private orpcClient: RouterClient<typeof router>;

	/**
	 * Creates a new c15t client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: C15tClientOptions) {
		this.backendURL = `${
			options.backendURL.endsWith('/')
				? options.backendURL.slice(0, -1)
				: options.backendURL
		}/rpc`;

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
			nonRetryableStatusCodes:
				options.retryConfig?.nonRetryableStatusCodes ??
				DEFAULT_RETRY_CONFIG.nonRetryableStatusCodes,
			shouldRetry:
				options.retryConfig?.shouldRetry ?? DEFAULT_RETRY_CONFIG.shouldRetry,
			retryOnNetworkError:
				options.retryConfig?.retryOnNetworkError ??
				DEFAULT_RETRY_CONFIG.retryOnNetworkError,
		};

		// Create the RPC link with the configured options
		const link = new RPCLink({
			url: this.backendURL,
			headers: this.headers,
		});

		// Initialize ORPC client
		this.orpcClient = createORPCClient(link);

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

		// Case 2: backendURL is relative (like '/rpc')
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
	 * Sets the client's callback functions.
	 */
	setCallbacks(callbacks: ConsentManagerCallbacks): void {
		this.callbacks = callbacks;
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
	private async fetcher<M extends ConsentMethod>(
		method: M,
		options?: FetchOptions<MethodResponseMap[M], MethodParamMap[M]>
	): Promise<ResponseContext<MethodResponseMap[M]>> {
		try {
			const handler = this.orpcClient.consent[method] as (
				params: MethodParamMap[M]
			) => Promise<MethodResponseMap[M]>;

			const params = options?.body as MethodParamMap[M];
			const response = await handler(params);

			return {
				ok: true,
				data: response,
				response: new Response(JSON.stringify(response), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
				error: null,
			};
		} catch (error) {
			const context: ResponseContext<MethodResponseMap[M]> = {
				ok: false,
				data: null,
				response: null,
				error: {
					message: error instanceof Error ? error.message : 'Unknown error',
					status: error instanceof Error ? 500 : 400,
					cause: error,
				},
			};

			this.callbacks?.onError?.(context, method);
			return context;
		}
	}

	/**
	 * Checks if a consent banner should be shown.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	async showConsentBanner(): Promise<ResponseContext<ShowBannerResponse>> {
		try {
			const response = await this.orpcClient.consent.showBanner();

			return createResponseContext(true, {
				showConsentBanner: response.showConsentBanner,
				jurisdiction: response.jurisdiction,
				location: response.location,
			});
		} catch (error) {
			const errorContext = createResponseContext<ShowBannerResponse>(
				false,
				null,
				{
					message: error instanceof Error ? error.message : String(error),
					status: 500,
					code: 'SHOW_BANNER_ERROR',
				}
			);
			if (this.callbacks?.onError) {
				this.callbacks.onError(errorContext, 'showConsentBanner');
			}
			throw error;
		}
	}

	/**
	 * Sets consent preferences for a subject.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequest>
	): Promise<ResponseContext<SetConsentResponse>> {
		try {
			const response = await this.orpcClient.consent.post({
				type: options?.body?.type || 'cookie_banner',
				domain: options?.body?.domain || window.location.hostname,
				preferences: options?.body?.preferences || {},
				subjectId: options?.body?.subjectId || '',
				metadata: options?.body?.metadata || {},
				externalSubjectId: options?.body?.externalSubjectId,
			});

			return createResponseContext(true, {
				id: response.id,
				subjectId: response.subjectId || '',
				externalSubjectId: response.externalSubjectId,
				domainId: response.domainId,
				domain: response.domain,
				type: response.type,
				status: response.status as 'active' | 'expired',
				recordId: response.recordId,
				metadata: response.metadata || {},
				givenAt: response.givenAt,
			});
		} catch (error) {
			const errorContext = createResponseContext<SetConsentResponse>(
				false,
				null,
				{
					message: error instanceof Error ? error.message : String(error),
					status: 500,
					code: 'SET_CONSENT_ERROR',
				}
			);
			if (this.callbacks?.onError) {
				this.callbacks.onError(errorContext, 'setConsent');
			}
			throw error;
		}
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequest>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		try {
			const response = await this.orpcClient.consent.verify({
				type: options?.body?.type || 'cookie_banner',
				domain: options?.body?.domain || window.location.hostname,
				subjectId: options?.body?.subjectId || '',
				externalSubjectId: options?.body?.externalSubjectId,
				preferences: options?.body?.preferences,
			});

			return createResponseContext(true, {
				isValid: response.isValid,
				consent: response.consent,
				reasons: response.reasons,
			});
		} catch (error) {
			const errorContext = createResponseContext<VerifyConsentResponse>(
				false,
				null,
				{
					message: error instanceof Error ? error.message : String(error),
					status: 500,
					code: 'VERIFY_CONSENT_ERROR',
				}
			);
			if (this.callbacks?.onError) {
				this.callbacks.onError(errorContext, 'verifyConsent');
			}
			throw error;
		}
	}

	/**
	 * Makes a custom API request to any endpoint.
	 */
	async $fetch<ResponseType>(
		path: string,
		options?: FetchOptions<ResponseType>
	): Promise<ResponseContext<ResponseType>> {
		return this.fetcher(
			path as ConsentMethod,
			options as FetchOptions<
				MethodResponseMap[ConsentMethod],
				MethodParamMap[ConsentMethod]
			>
		) as Promise<ResponseContext<ResponseType>>;
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

			const pendingSubmissions: SetConsentRequest[] = JSON.parse(
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
	private async processPendingSubmissions(submissions: SetConsentRequest[]) {
		const pendingSubmissionsKey = 'c15t-pending-consent-submissions';
		const maxRetries = 3;
		const remainingSubmissions = [...submissions];

		for (let i = 0; i < maxRetries && remainingSubmissions.length > 0; i++) {
			const successfulSubmissions: number[] = [];

			for (let j = 0; j < remainingSubmissions.length; j++) {
				const submission = remainingSubmissions[j];
				if (!submission) continue;

				try {
					console.log('Retrying consent submission:', submission);

					const orpcResponse = await this.orpcClient.consent.post(submission);
					const response = this.createResponseContext<SetConsentResponse>(
						true,
						orpcResponse,
						null,
						null
					);

					if (response.ok) {
						console.log('Successfully resubmitted consent');
						successfulSubmissions.push(j);
					}
				} catch (error) {
					console.warn('Failed to resend consent submission:', error);
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
