/**
 * Client exports for consent management.
 * This file provides a centralized export point for all client-related functionality.
 */

export {
	configureConsentManager,
	type ConsentManagerOptions,
	type ConsentManagerInterface,
	type ConsentManagerCallbacks,
	type EndpointHandlers,
} from './client-factory';

// Export HTTP client for advanced usage scenarios
export {
	C15tClient,
	type C15tClientOptions,
} from './client-c15t';

// Export Custom client for advanced usage scenarios
export {
	CustomClient,
	type CustomClientOptions,
	type EndpointHandler,
} from './client-custom';

// Export Offline client for testing and development
export {
	OfflineClient,
	type OfflineClientOptions,
} from './client-offline';
