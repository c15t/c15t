/**
 * Types for the custom client.
 * @packageDocumentation
 */

import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
	InitResponse,
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';

/**
 * Handler function for a specific endpoint
 */
export type EndpointHandler<
	ResponseType = unknown,
	BodyType = unknown,
	QueryType = unknown,
> = (
	options?: FetchOptions<ResponseType, BodyType, QueryType>
) => Promise<ResponseContext<ResponseType>>;

/**
 * Collection of endpoint handlers
 */
export interface EndpointHandlers {
	/**
	 * Handler for the init endpoint.
	 */
	init?: EndpointHandler<InitResponse>;

	/**
	 * Handler for the setConsent endpoint.
	 */
	setConsent: EndpointHandler<SetConsentResponse, SetConsentRequestBody>;

	/**
	 * Handler for the identifyUser endpoint (PATCH /subjects/:id).
	 * @remarks v2.0: Links external ID to a subject.
	 */
	identifyUser?: EndpointHandler<IdentifyUserResponse, IdentifyUserRequestBody>;
}

/**
 * Configuration options for the custom client
 */
export interface CustomClientOptions {
	/**
	 * Custom endpoint handlers
	 */
	endpointHandlers: EndpointHandlers;
}
