/**
 * Client exports for consent management.
 * This file provides a centralized export point for all client-related functionality.
 */
export {
	type ConsentManagerInterface,
	type ConsentManagerOptions,
	clearClientRegistry,
	configureConsentManager,
} from './client-factory';
export type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
	InitResponse,
	SetConsentRequestBody,
	SetConsentResponse,
} from './client-interface';
export {
	CustomClient,
	type CustomClientOptions,
	type EndpointHandler,
} from './custom';
export { C15tClient, type C15tInternalClientOptions } from './hosted';
export { OfflineClient, type OfflineClientOptions } from './offline';
