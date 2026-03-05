/**
 * Client factory for creating consent management clients.
 * This module provides the main factory function for creating
 * client instances based on configuration options.
 */
import type { StoreOptions } from '../store/type';
import type { ConsentManagerInterface } from './client-interface';
import { CustomClient, type EndpointHandlers } from './custom';
import { C15tClient } from './hosted';
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
const DEFAULT_CLIENT_MODE = 'hosted';

/**
 * Legacy alias warning guard
 */
let hasWarnedAboutLegacyC15tMode = false;

export type ClientMode = 'hosted' | 'c15t' | 'offline' | 'custom';
type CanonicalClientMode = 'hosted' | 'offline' | 'custom';

/**
 * Normalizes {@link ClientMode} values into a canonical {@link CanonicalClientMode}.
 *
 * @param mode Optional client mode from user-provided options.
 * @returns Canonical mode value used by the client factory.
 *
 * @remarks
 * - Legacy `mode: 'c15t'` is mapped to {@link DEFAULT_CLIENT_MODE}.
 * - A one-time deprecation warning is emitted in non-production via
 *   {@link hasWarnedAboutLegacyC15tMode}.
 * - Unknown/omitted values also fall back to {@link DEFAULT_CLIENT_MODE}.
 * - This function does not throw.
 */
function normalizeClientMode(mode?: ClientMode): CanonicalClientMode {
	if (mode === 'c15t') {
		const nodeEnv =
			typeof globalThis !== 'undefined' && 'process' in globalThis
				? (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
						?.env?.NODE_ENV
				: undefined;

		if (!hasWarnedAboutLegacyC15tMode && nodeEnv !== 'production') {
			hasWarnedAboutLegacyC15tMode = true;
			console.warn(
				"[c15t] `mode: 'c15t'` is deprecated and will be removed in a future major release. Use `mode: 'hosted'` instead."
			);
		}
		return DEFAULT_CLIENT_MODE;
	}

	if (mode === 'offline' || mode === 'custom') {
		return mode;
	}

	return DEFAULT_CLIENT_MODE;
}

function assertUnreachableMode(mode: never): never {
	throw new Error(`Unsupported client mode: ${String(mode)}`);
}

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
	const normalizedMode = normalizeClientMode(options.mode);

	// Serialize storageConfig for all modes
	const storageConfigPart = serializeStorageConfig(options.storageConfig);
	const storageKey = storageConfigPart ? `:storage:${storageConfigPart}` : '';

	if (normalizedMode === 'offline') {
		// Include basic translation configuration in the cache key so that
		// different offline clients with different language sets do not share
		// the same instance.
		const initialTranslations =
			options.store?.initialTranslationConfig?.translations;
		const initialDefaultLanguage =
			options.store?.initialTranslationConfig?.defaultLanguage;
		let translationPart = '';
		if (initialTranslations) {
			translationPart = `:translations:${Object.keys(initialTranslations).sort().join(',')}`;
		} else {
			translationPart = '';
		}

		let defaultLanguagePart = '';
		if (initialDefaultLanguage) {
			defaultLanguagePart = `:default-language:${initialDefaultLanguage}`;
		} else {
			defaultLanguagePart = '';
		}

		// Include IAB config in the cache key so that offline clients with
		// different IAB settings (enabled/disabled, different GVL) don't share
		// the same cached instance.
		const iabConfig = options.store?.iab;
		let iabPart = '';
		if (iabConfig?.enabled) {
			iabPart = ':iab:enabled';
		} else {
			iabPart = '';
		}

		const offlinePolicyConfig = options.store?.offlinePolicy;
		let offlinePolicyPart = '';
		if (offlinePolicyConfig) {
			offlinePolicyPart = `:policy:${JSON.stringify(offlinePolicyConfig)}`;
		}

		return `offline${storageKey}${translationPart}${defaultLanguagePart}${iabPart}${offlinePolicyPart}`;
	}

	if (normalizedMode === 'custom') {
		// Include handler keys in the cache key to differentiate custom clients
		const handlers =
			'endpointHandlers' in options ? options.endpointHandlers : undefined;
		const handlerKeys = Object.keys(handlers || {})
			.sort()
			.join(',');
		return `custom:${handlerKeys}${storageKey}`;
	}

	// For hosted clients, include headers in the cache key if present
	let headersPart = '';
	if ('headers' in options && options.headers) {
		// Sort header keys for a stable key
		const headerKeys = Object.keys(options.headers).sort();
		headersPart = `:headers:${headerKeys.map((k) => `${k}=${options.headers?.[k]}`).join(',')}`;
	}

	// For hosted clients, use the backendURL as the key
	return `hosted:${options.backendURL || ''}${headersPart}${storageKey}`;
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

export interface HostedClientOptions {
	/**
	 * Hosted mode (default) - requires a backend URL
	 *
	 * @remarks
	 * `'c15t'` is deprecated and will be removed in a future major release.
	 */
	mode?: 'hosted' | 'c15t';

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
}

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
	 *   mode: 'hosted',
	 *   storageConfig: {
	 *     crossSubdomain: true,
	 *     storageKey: 'my-consent',
	 *   },
	 * });
	 * ```
	 */
	storageConfig?: import('../libs/cookie').StorageConfig;
} & (CustomClientOptions | HostedClientOptions | OfflineClientOptions);

/**
 * @deprecated Use {@link HostedClientOptions} instead.
 */
export type C15TClientOptions = HostedClientOptions;

/**
 * Creates a new consent management client.
 *
 * This factory function creates the appropriate client implementation based on
 * the provided options. It supports three main operating modes:
 *
 * 1. Hosted mode - Makes actual HTTP requests to a consent management backend
 * 2. Custom mode - Uses provided handler functions instead of HTTP requests
 * 3. Offline mode - Disables all API requests and returns empty successful responses
 *
 * @param options - Configuration options for the client
 * @returns A client instance that implements the ConsentManagerInterface
 *
 * @example
 * Basic hosted client with backend URL:
 * ```typescript
 * const client = configureConsentManager({
 *   backendURL: '/api/c15t'
 * });
 * ```
 *
 * @example
 * Hosted client with custom backend URL:
 * ```typescript
 * const client = configureConsentManager({
 *   mode: 'hosted',
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
	const mode = normalizeClientMode(options.mode);
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
		case 'offline': {
			// Extract IAB config for offline mode
			const iabConfig = options.store?.iab;
			const policyConfig = options.store?.offlinePolicy;
			client = new OfflineClient(
				options.storageConfig,
				options.store?.initialTranslationConfig,
				iabConfig
					? {
							enabled: iabConfig.enabled,
							vendorIds: iabConfig.vendors,
							gvl: iabConfig.gvl,
						}
					: undefined,
				policyConfig
			);
			break;
		}
		case 'hosted': {
			const hostedOptions = options as HostedClientOptions;
			// Extract IAB config for fallback mode
			const iabConfig = options.store?.iab;
			client = new C15tClient({
				backendURL: hostedOptions.backendURL || DEFAULT_BACKEND_URL,
				headers: hostedOptions.headers,
				customFetch: hostedOptions.customFetch,
				retryConfig: hostedOptions.retryConfig,
				storageConfig: options.storageConfig,
				iabConfig: iabConfig
					? {
							enabled: iabConfig.enabled,
							vendorIds: iabConfig.vendors,
							gvl: iabConfig.gvl,
						}
					: undefined,
			});
			break;
		}
		default: {
			client = assertUnreachableMode(mode);
			break;
		}
	}

	// Store the client in the registry
	clientRegistry.set(cacheKey, client);

	return client;
}

/**
 * Clears the internal client registry cache.
 *
 * This is primarily useful for testing scenarios where different
 * configurations need fresh client instances between tests.
 */
export function clearClientRegistry(): void {
	clientRegistry.clear();
}
