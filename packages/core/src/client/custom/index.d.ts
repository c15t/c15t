/**
 * Custom implementation of the consent client interface.
 * This client uses provided handlers instead of making HTTP requests.
 *

 */
import type {
	ConsentManagerInterface,
	IdentifyUserRequestBody,
	IdentifyUserResponse,
	InitResponse,
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { CustomClientOptions, EndpointHandler } from './types';
/**
 * Custom implementation of the consent client interface.
 * Uses provided handlers instead of making HTTP requests.
 *
 * @remarks
 * v2.0: Subject-centric API. Use setConsent for all consent operations.
 */
export declare class CustomClient implements ConsentManagerInterface {
	/**
	 * Custom endpoint handlers
	 * @internal
	 */
	private endpointHandlers;
	/**
	 * Dynamic endpoint handlers for custom paths
	 * @internal
	 */
	private dynamicHandlers;
	/**
	 * Creates a new custom client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: CustomClientOptions);
	/**
	 * Checks if a consent banner should be shown.
	 */
	init(
		options?: FetchOptions<InitResponse>
	): Promise<ResponseContext<InitResponse>>;
	/**
	 * Sets consent preferences for a subject.
	 *
	 * @remarks
	 * v2.0: This uses the subject endpoint handler.
	 */
	setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>>;
	/**
	 * Links an external user ID to a subject.
	 *
	 * @remarks
	 * v2.0: Uses identifyUser endpoint handler if provided, otherwise falls back to $fetch.
	 */
	identifyUser(
		options: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
	): Promise<ResponseContext<IdentifyUserResponse>>;
	/**
	 * Registers a dynamic endpoint handler
	 */
	registerHandler<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		handler: EndpointHandler<ResponseType, BodyType, QueryType>
	): void;
	/**
	 * Makes a custom API request to any endpoint.
	 */
	$fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>>;
}
export type {
	CustomClientOptions,
	EndpointHandler,
	EndpointHandlers,
} from './types';
