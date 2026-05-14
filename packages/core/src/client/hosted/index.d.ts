/**
 * c15t backend implementation of the consent client interface.
 * This client makes HTTP requests to the c15t consent management backend.
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
import type { C15tInternalClientOptions } from './types';
/**
 * c15t backend implementation of the consent client interface.
 * Makes HTTP requests to the c15t consent management backend.
 *
 * @remarks
 * v2.0: Subject-centric API. Use setConsent for all consent operations.
 */
export declare class C15tClient implements ConsentManagerInterface {
	/**
	 * Base URL for API requests (without trailing slash)
	 * @internal
	 */
	private backendURL;
	/**
	 * Storage configuration for offline fallback
	 * @internal
	 */
	private readonly storageConfig?;
	/**
	 * IAB configuration for offline/fallback mode
	 * @internal
	 */
	private readonly iabConfig?;
	/**
	 * Default headers to include with all requests
	 * @internal
	 */
	private headers;
	/**
	 * Custom fetch implementation (if provided)
	 * @internal
	 */
	private customFetch?;
	/**
	 * CORS mode for fetch requests
	 * @internal
	 */
	private corsMode;
	/**
	 * Global retry configuration for fetch requests.
	 * @internal
	 */
	private retryConfig;
	/**
	 * Fetcher context for API requests
	 * @internal
	 */
	private fetcherContext;
	/**
	 * Creates a new c15t client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: C15tInternalClientOptions);
	/**
	 * Checks if a consent banner should be shown.
	 * If the API request fails, falls back to offline mode behavior.
	 */
	init(
		options?: FetchOptions<InitResponse>
	): Promise<ResponseContext<InitResponse>>;
	/**
	 * Sets consent preferences for a subject.
	 * If the API request fails, falls back to offline mode behavior.
	 *
	 * @remarks
	 * v2.0: This calls POST /subjects with a client-generated subjectId.
	 */
	setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>>;
	/**
	 * Links an external user ID to a subject via PATCH /subjects/:id.
	 * Saves to storage first (optimistic), then makes API call with fallback.
	 *
	 * @remarks
	 * v2.0: Maps to PATCH /subjects/:id endpoint.
	 */
	identifyUser(
		options: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
	): Promise<ResponseContext<IdentifyUserResponse>>;
	/**
	 * Makes a custom API request to any endpoint.
	 */
	$fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>>;
	/**
	 * Check for pending consent submissions on initialization
	 * @internal
	 */
	private checkPendingConsentSubmissions;
	/**
	 * Process pending consent submissions
	 * @internal
	 */
	private processPendingConsentSubmissions;
	/**
	 * Check for pending identify user submissions on initialization
	 * @internal
	 */
	private checkPendingIdentifySubmissions;
	/**
	 * Process pending identify user submissions
	 * @internal
	 */
	private processPendingIdentifySubmissions;
}
export type { C15tInternalClientOptions } from './types';
