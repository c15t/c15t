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

import { C15tClient } from './client-c15t';
import { CustomClient, EndpointHandlers } from './client-custom';
import {
	ConsentClientCallbacks,
	ConsentClientInterface,
} from './client-interface';
import type { FetchOptions, ResponseContext } from './types';

/**
 * Default consent banner API URL
 */
const DEFAULT_BACKEND_URL = '/api/c15t';

/**
 * Union type of all possible client options
 */
export type ConsentClientOptions = {
	/**
	 * Client callbacks
	 */
	callbacks?: ConsentClientCallbacks;
} & (
	| {
			/**
			 * Custom mode with endpoint handlers
			 */
			mode: 'custom';

			/**
			 * Custom endpoint handlers
			 */
			endpointHandlers: EndpointHandlers;

			/**
			 * Not used in custom mode
			 */
			backendURL?: never;
	  }
	| {
			/**
			 * C15t mode (default)
			 */
			mode?: 'c15t';

			/**
			 * Backend URL for API endpoints
			 */
			backendURL?: string | false;

			/**
			 * Additional HTTP headers
			 */
			headers?: Record<string, string>;

			/**
			 * Custom fetch implementation
			 */
			customFetch?: typeof fetch;
	  }
);

/**
 * Creates a new consent management client.
 *
 * This factory function creates the appropriate client implementation based on
 * the provided options. It supports two main operating modes:
 *
 * 1. C15t mode - Makes actual HTTP requests to a consent management backend
 * 2. Custom mode - Uses provided handler functions instead of HTTP requests
 *
 * @param options - Configuration options for the client
 * @returns A client instance that implements the ConsentClientInterface
 *
 * @example
 * Basic C15t client with default backend URL:
 * ```typescript
 * const client = createConsentClient({});
 * ```
 *
 * @example
 * C15t client with custom backend URL:
 * ```typescript
 * const client = createConsentClient({
 *   backendURL: 'https://api.example.com/consent'
 * });
 * ```
 *
 * @example
 * Disabled C15t client (for testing):
 * ```typescript
 * const client = createConsentClient({
 *   backendURL: false
 * });
 * ```
 *
 * @example
 * Custom client with handler functions:
 * ```typescript
 * const client = createConsentClient({
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
export function createConsentClient(
	options: ConsentClientOptions
): ConsentClientInterface {
	if (options.mode === 'custom') {
		// Create a custom client with the provided handlers
		return new CustomClient({
			endpointHandlers: options.endpointHandlers,
			callbacks: options.callbacks,
		});
	} else {
		// Create a C15t client with the provided options
		return new C15tClient({
			backendURL:
				options.backendURL === undefined
					? DEFAULT_BACKEND_URL
					: options.backendURL,
			headers: options.headers,
			customFetch: options.customFetch,
			callbacks: options.callbacks,
		});
	}
}

// Re-export core types for convenience
export type {
	ConsentClientInterface,
	ConsentClientCallbacks,
	EndpointHandlers,
	ResponseContext,
	FetchOptions,
	ShowConsentBannerResponse,
	SetConsentResponse,
	SetConsentRequestBody,
	VerifyConsentResponse,
	VerifyConsentRequestBody,
};
