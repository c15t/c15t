/**
 * IAB configuration for offline/fallback mode GVL fetching.
 */
export interface IABFallbackConfig {
	/**
	 * Whether IAB mode is enabled on the client.
	 */
	enabled: boolean;

	/**
	 * Vendor IDs to fetch from GVL endpoint.
	 */
	vendorIds?: number[];
}

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
	 * CORS mode for fetch requests.
	 * @default 'cors'
	 */
	corsMode?: RequestMode;

	/**
	 * Global retry configuration for fetch requests.
	 * Can be overridden per request in `FetchOptions`.
	 * @default { maxRetries: 3, initialDelayMs: 100, backoffFactor: 2, retryableStatusCodes: [500, 502, 503, 504] }
	 */
	retryConfig?: import('../types').RetryConfig;

	/**
	 * Storage configuration for offline fallback
	 */
	storageConfig?: import('../../libs/cookie').StorageConfig;

	/**
	 * IAB configuration for offline/fallback mode.
	 * When the backend is unavailable and IAB is enabled,
	 * the client will fetch GVL from gvl.consent.io with these settings.
	 */
	iabConfig?: IABFallbackConfig;
}
