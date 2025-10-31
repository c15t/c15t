/**
 * Core client interface for consent management.
 * This interface defines the methods that any consent client must implement.
 */

import type { ContractsInputs, ContractsOutputs } from '@c15t/backend';
import type { FetchOptions, ResponseContext } from './types';

export type SetConsentRequestBody = ContractsInputs['consent']['post'];
export type SetConsentResponse = ContractsOutputs['consent']['post'];
export type ShowConsentBannerResponse =
	ContractsOutputs['consent']['showBanner'];
export type VerifyConsentRequestBody = ContractsInputs['consent']['verify'];
export type VerifyConsentResponse = ContractsOutputs['consent']['verify'];
export type IdentifyUserRequestBody = ContractsInputs['consent']['identify'];
export type IdentifyUserResponse = ContractsOutputs['consent']['identify'];

/**
 * Core interface that all consent management clients must implement
 *
 * @remarks
 * This interface defines the standard methods for interacting with
 * consent management functionality, regardless of implementation.
 */
export interface ConsentManagerInterface {
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
	 * Links a subject's external ID to a consent record by consent ID.
	 *
	 * @param options - Optional request configuration with consent ID and external ID
	 * @returns Response confirming the user was identified
	 */
	identifyUser(
		options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
	): Promise<ResponseContext<IdentifyUserResponse>>;

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
}

/**
 * Payload for the onConsentSet callback
 */
export interface ConsentSetCallbackPayload {
	type: string;
	preferences: Record<string, boolean>;
	domain?: string;
}

/**
 * Payload for the onConsentBannerFetched callback
 */
export interface ConsentBannerFetchedCallbackPayload {
	showConsentBanner: boolean;
	jurisdiction: { code: string; message: string };
	location?: { countryCode: string | null; regionCode: string | null };
}

/**
 * Payload for the onConsentVerified callback
 */
export interface ConsentVerifiedCallbackPayload {
	type: string;
	domain?: string;
	preferences: string[];
	valid: boolean;
}
