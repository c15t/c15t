/**
 * Core client interface for consent management.
 * This interface defines the methods that any consent client must implement.
 */

import type {
	CheckConsentOutput,
	CheckConsentQuery,
	GetSubjectInput,
	GetSubjectOutput,
	InitOutput,
	ListSubjectsOutput,
	ListSubjectsQuery,
	PatchSubjectFullInput,
	PatchSubjectOutput,
	PostSubjectInput,
	PostSubjectOutput,
} from '@c15t/schema/types';
import type { FetchOptions, ResponseContext } from './types';

export type { PostSubjectInput, PostSubjectOutput };
export type { GetSubjectInput, GetSubjectOutput };
export type { PatchSubjectFullInput, PatchSubjectOutput };
export type { ListSubjectsQuery, ListSubjectsOutput };
export type { CheckConsentQuery, CheckConsentOutput };

/**
 * Request body for setConsent.
 */
export type SetConsentRequestBody = PostSubjectInput;

/**
 * Response from setConsent.
 */
export type SetConsentResponse = PostSubjectOutput;

/**
 * Request body for identifyUser (links external ID to subject).
 * Requires subjectId in path, externalId and identityProvider in body.
 */
export type IdentifyUserRequestBody = PatchSubjectFullInput;

/**
 * Response from identifyUser.
 */
export type IdentifyUserResponse = PatchSubjectOutput;

export type InitResponse = InitOutput;

/**
 * Core interface that all consent management clients must implement
 */
export interface ConsentManagerInterface {
	/**
	 * Checks if a consent banner should be shown.
	 *
	 * @param options - Optional request configuration
	 * @returns Response with information about whether to show the consent banner
	 */
	init(
		options?: FetchOptions<InitResponse>
	): Promise<ResponseContext<InitResponse>>;

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
	 * Links an external user ID to a subject (PATCH /subject/:id).
	 *
	 * @param options - Request configuration with subjectId, externalId, and identityProvider
	 * @returns Response confirming the subject was updated
	 */
	identifyUser(
		options: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
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
