/**
 * Client factory for creating consent management clients.
 * This module provides the main factory function for creating
 * client instances based on configuration options.
 */

import type {
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '@c15t/backend';

import type { StoreOptions } from '../store';
import { C15tClient } from './client-c15t';
import { CustomClient, type EndpointHandlers } from './client-custom';
import type {
	ConsentManagerCallbacks,
	ConsentManagerInterface,
} from './client-interface';
import { OfflineClient } from './client-offline';
import type { FetchOptions, ResponseContext, RetryConfig } from './types';

/**
 * Default API endpoint URL
 */
const DEFAULT_BACKEND_URL = '/api/c15t';

/**
 * Default client mode
 */
const DEFAULT_CLIENT_MODE = 'c15t';

/**
 * Configuration for Custom mode
 * Allows for complete control over endpoint handling
 */
export type CustomClientOptions = {
	/**
	 * Operating mode - custom endpoint implementation
	 */
	mode: 'custom';

	/**
	 * Custom handlers for each consent endpoint
	 * Implement your own logic for each API operation
	 */
	endpointHandlers: EndpointHandlers;

	/**
	 * Global callbacks for request events
	 */
	callbacks?: ConsentManagerCallbacks;

	/**
	 * Store configuration options
	 */
	store?: StoreOptions;

	/**
	 * Backend URL is not used in custom mode
	 */
	backendURL?: never;
};

export type C15TClientOptions = {
	/**
	 * c15t mode (default) - requires a backend URL
	 */
	mode?: 'c15t';

	/**
	 * Backend URL for API endpoints
	 */
	backendURL: string;

	/**
	 * Additional HTTP headers
	 */
	headers?: Record<string, string>;

	/**
	 * Custom fetch implementation
	 */
	customFetch?: typeof fetch;

	/**
	 * Retry configuration
	 */
	retryConfig?: RetryConfig;
};

export type OfflineClientOptions = {
	/**
	 * Offline mode - disables all API requests
	 */
	mode: 'offline';

	/**
	 * Not used in offline mode
	 */
	backendURL?: never;

	/**
	 * Additional HTTP headers (not used in offline mode)
	 */
	headers?: never;

	/**
	 * Custom fetch implementation (not used in offline mode)
	 */
	customFetch?: never;
};

/**
 * Union type of all possible client options
 */
export type ConsentManagerOptions = {
	/**
	 * Client callbacks
	 */
	callbacks?: ConsentManagerCallbacks;
	store?: StoreOptions;
} & (CustomClientOptions | C15TClientOptions | OfflineClientOptions);

/**
 * Creates a new consent management client.
 *
 * This factory function creates the appropriate client implementation based on
 * the provided options. It supports three main operating modes:
 *
 * 1. c15t mode - Makes actual HTTP requests to a consent management backend
 * 2. Custom mode - Uses provided handler functions instead of HTTP requests
 * 3. Offline mode - Disables all API requests and returns empty successful responses
 *
 * @param options - Configuration options for the client
 * @returns A client instance that implements the ConsentManagerInterface
 *
 * @example
 * Basic c15t client with backend URL:
 * ```typescript
 * const client = configureConsentManager({
 *   backendURL: '/api/c15t'
 * });
 * ```
 *
 * @example
 * c15t client with custom backend URL:
 * ```typescript
 * const client = configureConsentManager({
 *   backendURL: 'https://api.example.com/consent'
 * });
 * ```
 *
 * @example
 * Offline client (for testing):
 * ```typescript
 * const client = configureConsentManager({
 *   mode: 'offline'
 * });
 * ```
 *
 * @example
 * Custom client with handler functions:
 * ```typescript
 * const client = configureConsentManager({
 *   mode: 'custom',
 *   endpointHandlers: {
 *     showConsentBanner: async () => ({
 *       data: { showConsentBanner: true },
 *       ok: true,
 *       error: null,
 *       response: null
 *     }),
 *     setConsent: async (options) => ({
 *       data: { success: true },
 *       ok: true,
 *       error: null,
 *       response: null
 *     }),
 *     verifyConsent: async (options) => ({
 *       data: { valid: true },
 *       ok: true,
 *       error: null,
 *       response: null
 *     })
 *   }
 * });
 * ```
 */
export function configureConsentManager(
	options: ConsentManagerOptions
): ConsentManagerInterface {
	// Determine the client mode, with fallback to default
	const mode = options.mode || DEFAULT_CLIENT_MODE;

	// Create the appropriate client based on the mode
	switch (mode) {
		case 'custom': {
			// Use a properly typed cast
			const customOptions = options as CustomClientOptions;
			return new CustomClient({
				endpointHandlers: customOptions.endpointHandlers,
				callbacks: customOptions.callbacks,
			});
		}
		case 'offline':
			return new OfflineClient({
				callbacks: options.callbacks,
			});
		default: {
			// Use a properly typed cast
			const c15tOptions = options as {
				backendURL: string;
				headers?: Record<string, string>;
				customFetch?: typeof fetch;
				callbacks?: ConsentManagerCallbacks;
			};
			return new C15tClient({
				backendURL: c15tOptions.backendURL || DEFAULT_BACKEND_URL,
				headers: c15tOptions.headers,
				customFetch: c15tOptions.customFetch,
				callbacks: c15tOptions.callbacks,
			});
		}
	}
}

// Re-export core types for convenience
export type {
	ConsentManagerInterface,
	ConsentManagerCallbacks,
	EndpointHandlers,
	ResponseContext,
	FetchOptions,
	ShowConsentBannerResponse,
	SetConsentResponse,
	SetConsentRequestBody,
	VerifyConsentResponse,
	VerifyConsentRequestBody,
};
