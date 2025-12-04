/**
 * Client factory for creating consent management clients.
 * This module provides the main factory function for creating
 * client instances based on configuration options.
 */
import type { StoreOptions } from '../store/type';
import { C15tClient } from './c15t';
import type { ConsentManagerInterface } from './client-interface';
import { CustomClient, type EndpointHandlers } from './custom';
import { OfflineClient } from './offline';
import type { RetryConfig } from './types';

export type { ConsentManagerInterface } from './client-interface';
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
 * Serializes storageConfig to a stable string representation
 *
 * @param storageConfig - The storage configuration to serialize
 * @returns A stable string representation of the storageConfig
 *
 * @internal
 */
function serializeStorageConfig(
	storageConfig?: import('../libs/cookie').StorageConfig
): string {
	if (!storageConfig) {
		return '';
	}

	// Sort keys alphabetically for stability and serialize
	const sorted = Object.keys(storageConfig)
		.sort()
		.map((key) => {
			const value = storageConfig[key as keyof typeof storageConfig];
			// Handle different value types consistently
			if (value === undefined || value === null) {
				return `${key}:null`;
			}
			return `${key}:${String(value)}`;
		})
		.join('|');

	return sorted;
}

/**
 * Create a stable cache key for client instances
 *
 * @param options - The consent manager options
 * @returns A unique cache key string
 *
 * @remarks
 * The cache key includes all configuration that affects client behavior,
 * including storageConfig to ensure clients with different storage
 * configurations don't share cache entries.
 *
 * @internal
 */
function getClientCacheKey(options: ConsentManagerOptions): string {
	// Serialize storageConfig for all modes
	const storageConfigPart = serializeStorageConfig(options.storageConfig);
	const storageKey = storageConfigPart ? `:storage:${storageConfigPart}` : '';

	if (options.mode === 'offline') {
		return `offline${storageKey}`;
	}

	if (options.mode === 'custom') {
		// Include handler keys in the cache key to differentiate custom clients
		const handlerKeys = Object.keys(options.endpointHandlers || {})
			.sort()
			.join(',');
		return `custom:${handlerKeys}${storageKey}`;
	}

	// For c15t clients, include headers in the cache key if present
	let headersPart = '';
	if ('headers' in options && options.headers) {
		// Sort header keys for a stable key
		const headerKeys = Object.keys(options.headers).sort();
		headersPart = `:headers:${headerKeys.map((k) => `${k}=${options.headers?.[k]}`).join(',')}`;
	}

	// For c15t clients, use the backendURL as the key
	return `c15t:${options.backendURL || ''}${headersPart}${storageKey}`;
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
	store?: StoreOptions;
	/**
	 * Storage configuration for consent persistence
	 *
	 * @remarks
	 * This is shared between the client and store to ensure consistent storage behavior.
	 * If not provided here, you can also configure it in store options.
	 *
	 * @example
	 * ```typescript
	 * const manager = configureConsentManager({
	 *   client: 'c15t',
	 *   projectId: 'your-project-id',
	 *   storageConfig: {
	 *     crossSubdomain: true,
	 *     storageKey: 'my-consent',
	 *   },
	 * });
	 * ```
	 */
	storageConfig?: import('../libs/cookie').StorageConfig;
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
			}
		}

		const existingClient = clientRegistry.get(cacheKey);
		if (existingClient) {
			return new Proxy(existingClient, {
				get(target, prop) {
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
			});
			break;
		}
		case 'offline':
			client = new OfflineClient(options.storageConfig);
			break;
		default: {
			const c15tOptions = options as {
				backendURL: string;
				headers?: Record<string, string>;
				customFetch?: typeof fetch;
				retryConfig?: RetryConfig;
			};
			client = new C15tClient({
				backendURL: c15tOptions.backendURL || DEFAULT_BACKEND_URL,
				headers: c15tOptions.headers,
				customFetch: c15tOptions.customFetch,
				retryConfig: c15tOptions.retryConfig,
				storageConfig: options.storageConfig,
			});
			break;
		}
	}

	// Store the client in the registry
	clientRegistry.set(cacheKey, client);

	return client;
}
