/**
 * Client exports for consent management.
 * This file provides a centralized export point for all client-related functionality.
 */

// Export HTTP client for advanced usage scenarios
export {
	C15tClient,
	type C15tClientOptions,
} from './c15t';
export {
	type ConsentManagerInterface,
	type ConsentManagerOptions,
	configureConsentManager,
} from './client-factory';
// Export Custom client for advanced usage scenarios
export {
	CustomClient,
	type CustomClientOptions,
	type EndpointHandler,
} from './custom';

// Export Offline client for testing and development
export {
	OfflineClient,
	type OfflineClientOptions,
} from './offline';
