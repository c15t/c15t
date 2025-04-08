/**
 * Core client interface for consent management.
 * This interface defines the methods that any consent client must implement.
 */

import type {
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '@c15t/backend';

import type { FetchOptions, ResponseContext } from './types';

/**
 * Core interface that all consent management clients must implement
 *
 * @remarks
 * This interface defines the standard methods for interacting with
 * consent management functionality, regardless of implementation.
 */
export interface ConsentClientInterface {
	/**
	 * Checks if a consent banner should be shown.
	 *
	 * @param options - Optional request configuration
	 * @returns Response with information about whether to show the consent banner
	 */
	showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>>;

	/**
	 * Sets consent preferences for a subject.
	 *
	 * @param options - Optional request configuration with consent data
	 * @returns Response confirming consent preferences were set
	 */
	setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>>;

	/**
	 * Verifies if valid consent exists.
	 *
	 * @param options - Optional request configuration with verification criteria
	 * @returns Response with consent verification status
	 */
	verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>>;

	/**
	 * Makes a custom API request to any endpoint.
	 *
	 * @param path - The API endpoint path
	 * @param options - Optional request configuration
	 * @returns Response from the custom endpoint
	 */
	$fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>>;

	/**
	 * Checks if the client is in disabled mode.
	 *
	 * @returns True if the client is disabled, false otherwise
	 */
	isDisabled(): boolean;

	/**
	 * Returns the client's configured callbacks.
	 *
	 * @returns The callbacks object or undefined if no callbacks are configured
	 */
	getCallbacks(): Record<string, any> | undefined;
}

/**
 * Base callback configuration for consent clients
 */
export interface ConsentClientCallbacks {
	/**
	 * Called when an API request fails.
	 * @param response - The full response context with error information
	 * @param path - The API endpoint path that was requested
	 */
	onError?: (response: ResponseContext<any>, path: string) => void;

	/**
	 * Called after successfully fetching the consent banner information
	 * @param response The response from the showConsentBanner endpoint
	 */
	onConsentBannerFetched?: (response: ResponseContext<any>) => void;

	/**
	 * Called after successfully setting consent preferences
	 * @param response The response from the setConsent endpoint
	 */
	onConsentSet?: (response: ResponseContext<any>) => void;

	/**
	 * Called after successfully verifying consent
	 * @param response The response from the verifyConsent endpoint
	 */
	onConsentVerified?: (response: ResponseContext<any>) => void;
}
