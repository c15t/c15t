/**
 * Custom implementation of the consent client interface.
 * This client uses provided handlers instead of making HTTP requests.
 */

import type {
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '@c15t/backend';

import {
	ConsentClientCallbacks,
	ConsentClientInterface,
} from './client-interface';
import { FetchOptions, ResponseContext } from './types';

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
	 * Any additional custom endpoints
	 * @param key - Endpoint name
	 */
	[key: string]: EndpointHandler<any, any, any>;
}

/**
 * Configuration options for the custom client
 */
export interface CustomClientOptions {
	/**
	 * Custom endpoint handlers
	 */
	endpointHandlers: EndpointHandlers;

	/**
	 * Global callbacks for handling responses
	 */
	callbacks?: ConsentClientCallbacks;
}

/**
 * Custom implementation of the consent client interface.
 * Uses provided handlers instead of making HTTP requests.
 */
export class CustomClient implements ConsentClientInterface {
	/**
	 * Custom endpoint handlers
	 * @internal
	 */
	private endpointHandlers: EndpointHandlers;

	/**
	 * Callback functions for client events
	 * @internal
	 */
	private callbacks?: ConsentClientCallbacks;

	/**
	 * Creates a new custom client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: CustomClientOptions) {
		this.endpointHandlers = options.endpointHandlers;
		this.callbacks = options.callbacks;
	}

	/**
	 * Checks if the client is in disabled mode.
	 * Custom client is never disabled.
	 *
	 * @returns Always returns false
	 */
	isDisabled(): boolean {
		return false;
	}

	/**
	 * Returns the client's configured callbacks.
	 *
	 * @returns The callbacks object or undefined if no callbacks are configured
	 */
	getCallbacks(): ConsentClientCallbacks | undefined {
		return this.callbacks;
	}

	/**
	 * Creates a basic response context for error cases.
	 */
	private createErrorResponse<T>(
		message: string,
		status = 500,
		code = 'HANDLER_ERROR',
		cause?: unknown
	): ResponseContext<T> {
		return {
			data: null,
			error: {
				message,
				status,
				code,
				cause,
			},
			ok: false,
			response: null,
		};
	}

	/**
	 * Handles execution of a specific endpoint handler.
	 */
	private async executeHandler<
		ResponseType,
		BodyType = unknown,
		QueryType = unknown,
	>(
		handlerKey: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>,
		callbackKey?: keyof Pick<
			Required<ConsentClientCallbacks>,
			'onConsentBannerFetched' | 'onConsentSet' | 'onConsentVerified'
		>
	): Promise<ResponseContext<ResponseType>> {
		// Check if handler exists
		const handler = this.endpointHandlers[handlerKey] as EndpointHandler<
			ResponseType,
			BodyType,
			QueryType
		>;

		if (!handler) {
			const errorResponse = this.createErrorResponse<ResponseType>(
				`No endpoint handler found for '${handlerKey}'`,
				404,
				'ENDPOINT_NOT_FOUND'
			);

			this.callbacks?.onError?.(errorResponse, handlerKey);

			if (options?.throw) {
				throw new Error(`No endpoint handler found for '${handlerKey}'`);
			}

			return errorResponse;
		}

		try {
			// Execute the handler
			const response = await handler(options);

			// Ensure response has consistent structure
			const normalizedResponse: ResponseContext<ResponseType> = {
				data: response.data,
				error: response.error,
				ok: response.ok ?? !response.error,
				response: response.response,
			};

			// Call success callback if response is successful
			if (
				normalizedResponse.ok &&
				callbackKey &&
				this.callbacks?.[callbackKey]
			) {
				const callback = this.callbacks[callbackKey] as (
					response: ResponseContext<ResponseType>
				) => void;
				callback(normalizedResponse);
			}

			return normalizedResponse;
		} catch (error) {
			// Handle errors from the handler
			const errorResponse = this.createErrorResponse<ResponseType>(
				error instanceof Error ? error.message : String(error),
				0,
				'HANDLER_ERROR',
				error
			);

			this.callbacks?.onError?.(errorResponse, handlerKey);

			if (options?.throw) {
				throw error;
			}

			return errorResponse;
		}
	}

	/**
	 * Checks if a consent banner should be shown.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		return this.executeHandler<ShowConsentBannerResponse>(
			'showConsentBanner',
			options,
			'onConsentBannerFetched'
		);
	}

	/**
	 * Sets consent preferences for a subject.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return this.executeHandler<SetConsentResponse, SetConsentRequestBody>(
			'setConsent',
			options,
			'onConsentSet'
		);
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		return this.executeHandler<VerifyConsentResponse, VerifyConsentRequestBody>(
			'verifyConsent',
			options,
			'onConsentVerified'
		);
	}

	/**
	 * Makes a custom API request to any endpoint.
	 */
	async $fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		// Extract endpoint name from path
		const endpointName = path.replace(/^\/+/, '').split('/')[0];

		// Make sure endpointName is not undefined
		if (!endpointName) {
			return this.createErrorResponse<ResponseType>(
				'Invalid endpoint path',
				400,
				'INVALID_ENDPOINT'
			);
		}

		return this.executeHandler<ResponseType, BodyType, QueryType>(
			endpointName,
			options
		);
	}
}
