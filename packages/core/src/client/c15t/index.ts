/**
 * c15t backend implementation of the consent client interface.
 * This client makes HTTP requests to the c15t consent management backend.
 *

 */

import type {
	ConsentManagerInterface,
	IdentifyUserRequestBody,
	IdentifyUserResponse,
	InitResponse,
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { DEFAULT_RETRY_CONFIG } from './constants';
import type { FetcherContext } from './fetcher';
import { fetcher } from './fetcher';
import { identifyUser } from './identify-user';
import { init } from './init';
import {
	checkPendingConsentSubmissions,
	checkPendingIdentifySubmissions,
	processPendingConsentSubmissions,
	processPendingIdentifySubmissions,
} from './pending-submissions';
import { setConsent } from './set-consent';
import type { C15tClientOptions } from './types';

/**
 * c15t backend implementation of the consent client interface.
 * Makes HTTP requests to the c15t consent management backend.
 *
 * @remarks
 * v2.0: Subject-centric API. Use setConsent for all consent operations.
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
	 * IAB configuration for offline/fallback mode
	 * @internal
	 */
	private readonly iabConfig?: C15tClientOptions['iabConfig'];

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
		this.iabConfig = options.iabConfig;

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

		// Check for pending submissions on initialization
		this.checkPendingConsentSubmissions();
		this.checkPendingIdentifySubmissions();
	}

	/**
	 * Checks if a consent banner should be shown.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	async init(
		options?: FetchOptions<InitResponse>
	): Promise<ResponseContext<InitResponse>> {
		return init(this.fetcherContext, options, this.iabConfig);
	}

	/**
	 * Sets consent preferences for a subject.
	 * If the API request fails, falls back to offline mode behavior.
	 *
	 * @remarks
	 * v2.0: This calls POST /subjects with a client-generated subjectId.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return setConsent(this.fetcherContext, this.storageConfig, options);
	}

	/**
	 * Links an external user ID to a subject via PATCH /subjects/:id.
	 * Saves to storage first (optimistic), then makes API call with fallback.
	 *
	 * @remarks
	 * v2.0: Maps to PATCH /subjects/:id endpoint.
	 */
	async identifyUser(
		options: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
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
	 * Check for pending identify user submissions on initialization
	 * @internal
	 */
	private checkPendingIdentifySubmissions() {
		checkPendingIdentifySubmissions(this.fetcherContext, (submissions) =>
			this.processPendingIdentifySubmissions(submissions)
		);
	}

	/**
	 * Process pending identify user submissions
	 * @internal
	 */
	private async processPendingIdentifySubmissions(
		submissions: IdentifyUserRequestBody[]
	) {
		return processPendingIdentifySubmissions(this.fetcherContext, submissions);
	}
}

// Re-export types for convenience
export type { C15tClientOptions } from './types';
