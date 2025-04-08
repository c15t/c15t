/**
 * Offline implementation of the consent client interface.
 * This client returns empty successful responses without making any HTTP requests.
 */

import type {
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '@c15t/backend';

import type {
	ConsentManagerCallbacks,
	ConsentManagerInterface,
} from './client-interface';

import {
	API_ENDPOINTS,
	type FetchOptions,
	type ResponseContext,
} from './types';

/**
 * Configuration options for the Offline client
 */
export interface OfflineClientOptions {
	/**
	 * Global callbacks for handling API responses
	 */
	callbacks?: ConsentManagerCallbacks;

	/**
	 * Custom localStorage key to check for consent banner visibility
	 * @default 'c15t-consent'
	 */
	localStorageKey?: string;
}

/**
 * Offline implementation of the consent client interface.
 * Returns empty successful responses without making any HTTP requests.
 */
export class OfflineClient implements ConsentManagerInterface {
	/**
	 * Callback functions for client events
	 * @internal
	 */
	private callbacks?: ConsentManagerCallbacks;

	/**
	 * LocalStorage key for consent banner visibility
	 * @internal
	 */
	private localStorageKey: string;

	/**
	 * Creates a new Offline client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: OfflineClientOptions = {}) {
		this.callbacks = options.callbacks;
		this.localStorageKey = options.localStorageKey || 'c15t-consent';
	}

	/**
	 * Checks if the client is in disabled mode.
	 *
	 * @returns Always returns true for offline client
	 */
	isDisabled(): boolean {
		return true;
	}

	/**
	 * Returns the client's configured callbacks.
	 *
	 * @returns The callbacks object or undefined if no callbacks are configured
	 */
	getCallbacks(): ConsentManagerCallbacks | undefined {
		return this.callbacks;
	}

	/**
	 * Creates a response context object for success cases.
	 */
	private createResponseContext<T>(data: T | null = null): ResponseContext<T> {
		return {
			data,
			error: null,
			ok: true,
			response: null,
		};
	}

	/**
	 * Handles empty API response with callbacks.
	 */
	private async handleOfflineResponse<ResponseType>(
		path: string,
		options?: FetchOptions<ResponseType>,
		callbackKey?: keyof Pick<
			Required<ConsentManagerCallbacks>,
			'onConsentBannerFetched' | 'onConsentSet' | 'onConsentVerified'
		>
	): Promise<ResponseContext<ResponseType>> {
		const emptyResponse = this.createResponseContext<ResponseType>();

		// Call success callback if provided
		if (options?.onSuccess) {
			await options.onSuccess(emptyResponse);
		}

		// Call specific endpoint callbacks if they exist
		if (callbackKey && this.callbacks?.[callbackKey]) {
			const callback = this.callbacks[callbackKey] as (
				response: ResponseContext<ResponseType>
			) => void;
			callback(emptyResponse);
		}

		return emptyResponse;
	}

	/**
	 * Checks if a consent banner should be shown.
	 * In offline mode, will always return true unless localStorage has a value.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		// Check localStorage to see if the banner has been shown
		let shouldShow = true;

		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				const storedConsent = window.localStorage.getItem(this.localStorageKey);
				shouldShow = storedConsent === null;
			}
		} catch (error) {
			// Ignore localStorage errors (e.g., in environments where it's blocked)
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.warn('Failed to access localStorage:', error);
		}
		const response = this.createResponseContext<ShowConsentBannerResponse>({
			showConsentBanner: shouldShow,
			jurisdiction: {
				code: 'EU',
				message: 'EU',
			},
			location: { countryCode: 'US', regionCode: 'CA' },
		});

		// Call specific callback
		if (this.callbacks?.onConsentBannerFetched) {
			this.callbacks.onConsentBannerFetched(response);
		}

		// Call success callback if provided
		if (options?.onSuccess) {
			await options.onSuccess(response);
		}

		return response;
	}

	/**
	 * Sets consent preferences for a subject.
	 * In offline mode, saves to localStorage to track that consent was set.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		// Save to localStorage to remember that consent was set
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				window.localStorage.setItem(
					this.localStorageKey,
					JSON.stringify({
						timestamp: new Date().toISOString(),
						preferences: options?.body?.preferences || {},
					})
				);
			}
		} catch (error) {
			// Ignore localStorage errors
			console.warn('Failed to write to localStorage:', error);
		}

		return this.handleOfflineResponse<SetConsentResponse>(
			API_ENDPOINTS.SET_CONSENT,
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
		return this.handleOfflineResponse<VerifyConsentResponse>(
			API_ENDPOINTS.VERIFY_CONSENT,
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
		return this.handleOfflineResponse<ResponseType>(path, options);
	}
}
