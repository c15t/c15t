/**
 * Custom implementation of the consent client interface.
 * This client uses provided handlers instead of making HTTP requests.
 */

import type {
	ConsentManagerInterface,
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { customFetch } from './fetch';
import { setConsent } from './set-consent';
import { showConsentBanner } from './show-consent-banner';
import type {
	CustomClientOptions,
	EndpointHandler,
	EndpointHandlers,
} from './types';
import { verifyConsent } from './verify-consent';

/**
 * Custom implementation of the consent client interface.
 * Uses provided handlers instead of making HTTP requests.
 */
export class CustomClient implements ConsentManagerInterface {
	/**
	 * Custom endpoint handlers
	 * @internal
	 */
	private endpointHandlers: EndpointHandlers;

	/**
	 * Dynamic endpoint handlers for custom paths
	 * @internal
	 */
	private dynamicHandlers: Record<
		string,
		EndpointHandler<unknown, unknown, unknown>
	> = {};

	/**
	 * Creates a new custom client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: CustomClientOptions) {
		this.endpointHandlers = options.endpointHandlers;
	}

	/**
	 * Checks if a consent banner should be shown.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		return showConsentBanner(this.endpointHandlers, options);
	}

	/**
	 * Sets consent preferences for a subject.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return setConsent(this.endpointHandlers, options);
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		return verifyConsent(this.endpointHandlers, options);
	}

	/**
	 * Registers a dynamic endpoint handler
	 */
	registerHandler<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		handler: EndpointHandler<ResponseType, BodyType, QueryType>
	): void {
		this.dynamicHandlers[path] = handler as EndpointHandler<
			unknown,
			unknown,
			unknown
		>;
	}

	/**
	 * Makes a custom API request to any endpoint.
	 */
	async $fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		return customFetch<ResponseType, BodyType, QueryType>(
			this.endpointHandlers,
			this.dynamicHandlers as Record<
				string,
				(
					options?: FetchOptions<ResponseType, BodyType, QueryType>
				) => Promise<ResponseContext<ResponseType>>
			>,
			path,
			options
		);
	}
}

// Re-export types for convenience
export type {
	CustomClientOptions,
	EndpointHandler,
	EndpointHandlers,
} from './types';
