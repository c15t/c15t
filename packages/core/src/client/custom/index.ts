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
import { customFetch } from './fetch';
import { init } from './init';
import { setConsent } from './set-consent';
import type {
	CustomClientOptions,
	EndpointHandler,
	EndpointHandlers,
} from './types';

/**
 * Custom implementation of the consent client interface.
 * Uses provided handlers instead of making HTTP requests.
 *
 * @remarks
 * v2.0: Subject-centric API. Use setConsent for all consent operations.
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
	async init(
		options?: FetchOptions<InitResponse>
	): Promise<ResponseContext<InitResponse>> {
		return init(this.endpointHandlers, options);
	}

	/**
	 * Sets consent preferences for a subject.
	 *
	 * @remarks
	 * v2.0: This uses the subject endpoint handler.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return setConsent(this.endpointHandlers, options);
	}

	/**
	 * Links an external user ID to a subject.
	 *
	 * @remarks
	 * v2.0: Uses identifyUser endpoint handler if provided, otherwise falls back to $fetch.
	 */
	async identifyUser(
		options: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
	): Promise<ResponseContext<IdentifyUserResponse>> {
		if (this.endpointHandlers.identifyUser) {
			return this.endpointHandlers.identifyUser(options);
		}
		// Fallback: use $fetch with the path
		const subjectId = options.body?.id;
		if (!subjectId) {
			return {
				ok: false,
				data: null,
				response: null,
				error: {
					message: 'Subject ID is required to identify user',
					status: 400,
					code: 'MISSING_SUBJECT_ID',
				},
			};
		}
		return this.$fetch(`/subjects/${subjectId}`, {
			...options,
			method: 'PATCH',
		});
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
