/**
 * Client factory for creating consent management clients.
 * This module provides the main factory function for creating
 * client instances based on configuration options.
 */

export type {
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
export type {
	ConsentManagerCallbacks,
	ConsentManagerInterface,
} from './client-interface';
import { OfflineClient } from './client-offline';
import type { RetryConfig } from './types';
export type { FetchOptions, ResponseContext, RetryConfig } from './types';

/**
 * Default API endpoint URL
 */
const DEFAULT_BACKEND_URL = '/api/c15t';

/**
 * Default client mode
 */
const DEFAULT_CLIENT_MODE = 'c15t';

// Add at the module level (before the configureConsentManager function)
const clientRegistry = new Map<string, ConsentManagerInterface>();

/**
 * Create a stable cache key for client instances
 * @internal
 */
function getClientCacheKey(options: ConsentManagerOptions): string {
	if (options.mode === 'offline') {
		return 'offline';
	}

	if (options.mode === 'custom') {
		// Include handler keys in the cache key to differentiate custom clients
		const handlerKeys = Object.keys(options.endpointHandlers || {})
			.sort()
			.join(',');
		return `custom:${handlerKeys}`;
	}

	// For c15t clients, include headers in the cache key if present
	let headersPart = '';
	if ('headers' in options && options.headers) {
		// Sort header keys for a stable key
		const headerKeys = Object.keys(options.headers).sort();
		headersPart = `:headers:${headerKeys.map((k) => `${k}=${options.headers?.[k]}`).join(',')}`;
	}

	// For c15t clients, use the backendURL as the key
	return `c15t:${options.backendURL || ''}${headersPart}`;
}

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
	const cacheKey = getClientCacheKey(options);

	// Return existing client if found
	if (clientRegistry.has(cacheKey)) {
		// If the existing client is a C15tClient and new options include headers,
		// update the client's headers
		if (
			options.mode !== 'offline' &&
			options.mode !== 'custom' &&
			'headers' in options &&
			options.headers
		) {
			const existingClient = clientRegistry.get(cacheKey);
			// Update headers if the client is a C15tClient
			if (existingClient instanceof C15tClient) {
				// @ts-expect-error: headers is a private property
				existingClient.headers = {
					'Content-Type': 'application/json',
					...options.headers,
				};
				console.log('Updated cached client headers:', options.headers);
			}
		}

		const existingClient = clientRegistry.get(cacheKey);
		if (existingClient) {
			return new Proxy(existingClient, {
				get(target, prop) {
					if (prop === 'getCallbacks') {
						return () => options.callbacks;
					}
					return target[prop as keyof ConsentManagerInterface];
				},
			});
		}
	}

	// Create a new client
	const mode = options.mode || DEFAULT_CLIENT_MODE;
	let client: ConsentManagerInterface;

	// Create the appropriate client based on the mode
	switch (mode) {
		case 'custom': {
			const customOptions = options as CustomClientOptions;
			client = new CustomClient({
				endpointHandlers: customOptions.endpointHandlers,
				callbacks: customOptions.callbacks,
			});
			break;
		}
		case 'offline':
			client = new OfflineClient({
				callbacks: options.callbacks,
			});
			break;
		default: {
			const c15tOptions = options as {
				backendURL: string;
				headers?: Record<string, string>;
				customFetch?: typeof fetch;
				callbacks?: ConsentManagerCallbacks;
				retryConfig?: RetryConfig;
			};
			client = new C15tClient({
				backendURL: c15tOptions.backendURL || DEFAULT_BACKEND_URL,
				headers: c15tOptions.headers,
				customFetch: c15tOptions.customFetch,
				callbacks: c15tOptions.callbacks,
				retryConfig: c15tOptions.retryConfig,
			});
			break;
		}
	}

	// Store the client in the registry
	clientRegistry.set(cacheKey, client);

	return client;
}
