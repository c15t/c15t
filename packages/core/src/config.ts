/**
 * @packageDocumentation
 * Provides a unified configuration system for c15t consent management.
 */

import { type c15tClient, createConsentClient } from './client';
import type { StoreConfig } from './store';
import { createConsentManagerStore } from './store';
import type { c15tClientOptions } from './types/client';

/**
 * Unified configuration options for c15t consent management system.
 *
 * @remarks
 * This interface combines configurations for both the client API and the consent
 * management store, providing a single point of configuration for the entire system.
 *
 * @example
 * ```typescript
 * // Creating a complete c15t configuration
 * const config: c15tConfig = {
 *   client: {
 *     baseURL: 'https://api.example.com/consent',
 *     headers: {
 *       'X-API-Key': process.env.API_KEY,
 *     }
 *   },
 *   store: {
 *     namespace: 'myApp',
 *     trackingBlockerConfig: {
 *       enabledByDefault: false
 *     },
 *   }
 * };
 *
 * const { store, client } = createConsentManager(config);
 * ```
 */
export interface c15tConfig {
	/**
	 * Configuration options for the c15t API client.
	 *
	 * @remarks
	 * These options control how the client connects to and interacts with
	 * the c15t consent management API.
	 */
	client: c15tClientOptions;

	/**
	 * Configuration options for the consent management store.
	 *
	 * @remarks
	 * These options control the behavior of the consent management store,
	 * including persistence, tracking blocker, and consent banner API.
	 */
	store?: {
		/**
		 * Optional namespace for the store instance.
		 * This is used to access the store from the global window object.
		 *
		 * @default 'c15tStore'
		 */
		namespace?: string;

		/**
		 * Configuration for the tracking blocker.
		 */
		trackingBlockerConfig?: StoreConfig['trackingBlockerConfig'];

		/**
		 * URL to fetch consent banner information from.
		 */
		consentBannerApiUrl?: string;
	};
}

/**
 * Return type for the createConsentManager function.
 * Contains both the consent store and API client instances.
 */
export interface ConsentManagerInstance {
	/**
	 * The consent management store instance.
	 */
	store: ReturnType<typeof createConsentManagerStore>;

	/**
	 * The c15t API client instance.
	 */
	client: c15tClient;
}

/**
 * Creates a unified consent management system with both store and API client.
 *
 * @param config - Configuration options for the consent management system
 * @returns Object containing both the store and client instances
 *
 * @example
 * ```typescript
 * // Create a unified consent management system
 * const { store, client } = createConsentManager({
 *   client: {
 *     baseURL: 'https://api.example.com/consent',
 *     headers: { 'X-API-Key': 'your-api-key' }
 *   },
 *   store: {
 *     namespace: 'myConsentManager',
 *     consentBannerApiUrl: 'https://api.example.com/consent/banner-info'
 *   }
 * });
 *
 * // Use the store to manage consent
 * const unsubscribe = store.subscribe(state => {
 *   if (state.hasConsentFor('analytics')) {
 *     initializeAnalytics();
 *   }
 * });
 *
 * // Use the client to interact with the API
 * async function loadPurposes() {
 *   const { data } = await client.listPurposes();
 *   if (data) {
 *     renderConsentOptions(data);
 *   }
 * }
 * ```
 *
 * @throws Will throw an error if required configuration options are missing
 */
export function createConsentManager(
	config: c15tConfig
): ConsentManagerInstance {
	// Create the API client
	const client = createConsentClient(config.client);

	// Extract store config
	const storeConfig: StoreConfig = {
		trackingBlockerConfig: config.store?.trackingBlockerConfig,
	};

	// Create the store with the given namespace and config
	const store = createConsentManagerStore(
		client,
		config.store?.namespace,
		storeConfig
	);

	return { store, client };
}
