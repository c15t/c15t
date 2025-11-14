/**
 * c15t backend implementation of the consent client interface.
 * This client makes HTTP requests to the c15t consent management backend.
 */

import type {
	ConsentManagerInterface,
	IdentifyUserRequestBody,
	IdentifyUserResponse,
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { DEFAULT_RETRY_CONFIG } from './constants';
import type { FetcherContext } from './fetcher';
import { fetcher } from './fetcher';
import { identifyUser } from './identify-user';
import {
	checkPendingConsentSubmissions,
	checkPendingIdentifyUserSubmissions,
	processPendingConsentSubmissions,
	processPendingIdentifyUserSubmissions,
} from './pending-submissions';
import { setConsent } from './set-consent';
import { showConsentBanner } from './show-consent-banner';
import type { C15tClientOptions } from './types';
import { verifyConsent } from './verify-consent';

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
	 * Storage configuration for offline fallback
	 * @internal
	 */
	private readonly storageConfig?: import('../../libs/cookie').StorageConfig;

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
	 * CORS mode for fetch requests
	 * @internal
	 */
	private corsMode: RequestMode;

	/**
	 * Global retry configuration for fetch requests.
	 * @internal
	 */
	private retryConfig: import('../types').RetryConfig;

	/**
	 * Fetcher context for API requests
	 * @internal
	 */
	private fetcherContext: FetcherContext;

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
		this.corsMode = options.corsMode || 'cors';
		this.storageConfig = options.storageConfig;

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

		// Create fetcher context
		this.fetcherContext = {
			backendURL: this.backendURL,
			headers: this.headers,
			customFetch: this.customFetch,
			corsMode: this.corsMode,
			retryConfig: this.retryConfig,
		};

		// Check for pending consent submissions on initialization
		this.checkPendingConsentSubmissions();
		this.checkPendingIdentifyUserSubmissions();
	}

	/**
	 * Checks if a consent banner should be shown.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		return showConsentBanner(this.fetcherContext, options);
	}

	/**
	 * Sets consent preferences for a subject.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return setConsent(this.fetcherContext, this.storageConfig, options);
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		return verifyConsent(this.fetcherContext, options);
	}

	/**
	 * Links a subject's external ID to a consent record by consent ID.
	 */
	async identifyUser(
		options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
	): Promise<ResponseContext<IdentifyUserResponse>> {
		return identifyUser(this.fetcherContext, this.storageConfig, options);
	}

	/**
	 * Makes a custom API request to any endpoint.
	 */
	async $fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		return fetcher<ResponseType, BodyType, QueryType>(
			this.fetcherContext,
			path,
			options
		);
	}

	/**
	 * Check for pending consent submissions on initialization
	 * @internal
	 */
	private checkPendingConsentSubmissions() {
		checkPendingConsentSubmissions(this.fetcherContext, (submissions) =>
			this.processPendingConsentSubmissions(submissions)
		);
	}

	/**
	 * Process pending consent submissions
	 * @internal
	 */
	private async processPendingConsentSubmissions(
		submissions: SetConsentRequestBody[]
	) {
		return processPendingConsentSubmissions(this.fetcherContext, submissions);
	}

	/**
	 * Check for pending identify-user submissions on initialization
	 * @internal
	 */
	private checkPendingIdentifyUserSubmissions() {
		checkPendingIdentifyUserSubmissions(this.fetcherContext, (submissions) =>
			this.processPendingIdentifyUserSubmissions(submissions)
		);
	}

	/**
	 * Process pending identify-user submissions
	 * @internal
	 */
	private async processPendingIdentifyUserSubmissions(
		submissions: IdentifyUserRequestBody[]
	) {
		return processPendingIdentifyUserSubmissions(
			this.fetcherContext,
			submissions
		);
	}
}

// Re-export types for convenience
export type { C15tClientOptions } from './types';
