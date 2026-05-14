import type { StoreOptions } from '../store/type';
import type { ConsentManagerInterface } from './client-interface';
import { type EndpointHandlers } from './custom';
import type { RetryConfig } from './types';
export type { ConsentManagerInterface } from './client-interface';
export type { FetchOptions, ResponseContext, RetryConfig } from './types';
export type ClientMode = 'hosted' | 'c15t' | 'offline' | 'custom';
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
	 * Top-level offline policy configuration.
	 *
	 * @remarks
	 * When provided, this takes precedence over `store.offlinePolicy`.
	 *
	 * @see {@link https://c15t.com/docs/frameworks/javascript/policy-packs}
	 */
	offlinePolicy?: StoreOptions['offlinePolicy'];
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
export declare function configureConsentManager(
	options: ConsentManagerOptions
): ConsentManagerInterface;
/**
 * Clears the internal client registry cache.
 *
 * This is primarily useful for testing scenarios where different
 * configurations need fresh client instances between tests.
 */
export declare function clearClientRegistry(): void;
