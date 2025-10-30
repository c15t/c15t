import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
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
	 * Handler for the showConsentBanner endpoint
	 */
	showConsentBanner: EndpointHandler<ShowConsentBannerResponse>;

	/**
	 * Handler for the setConsent endpoint
	 */
	setConsent: EndpointHandler<SetConsentResponse, SetConsentRequestBody>;

	/**
	 * Handler for the verifyConsent endpoint
	 */
	verifyConsent: EndpointHandler<
		VerifyConsentResponse,
		VerifyConsentRequestBody
	>;

	/**
	 * Handler for the identifyUser endpoint
	 */
	identifyUser: EndpointHandler<IdentifyUserResponse, IdentifyUserRequestBody>;
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
