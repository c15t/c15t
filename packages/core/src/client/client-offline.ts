/**
 * Offline implementation of the consent client interface.
 * This client returns empty successful responses without making any HTTP requests.
 */

import type { router } from '@c15t/orpc-router/router';
import type { RouterClient } from '@orpc/server';
import type {
	ConsentManagerCallbacks,
	ConsentManagerInterface,
	ConsentSetCallbackPayload,
	ConsentVerifiedCallbackPayload,
	SetConsentRequest,
	SetConsentResponse,
	ShowBannerResponse,
	VerifyConsentRequest,
	VerifyConsentResponse,
} from './client-interface';
import type { FetchOptions, ResponseContext } from './types';

// Extract types from ORPC router
type ConsentRouter = RouterClient<typeof router>['consent'];

/**
 * Configuration options for the Offline client
 */
export interface OfflineClientOptions {
	/**
	 * Global callbacks for handling API responses
	 */
	callbacks?: ConsentManagerCallbacks;
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
	 * Creates a new Offline client instance.
	 *
	 * @param options - Configuration options for the client
	 */
	constructor(options: OfflineClientOptions = {}) {
		this.callbacks = options.callbacks;
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
	 * Sets the client's callback functions.
	 */
	setCallbacks(callbacks: ConsentManagerCallbacks): void {
		this.callbacks = callbacks;
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
		options?: FetchOptions<ResponseType>,
		callbackKey?: keyof Pick<
			Required<ConsentManagerCallbacks>,
			'onConsentBannerFetched' | 'onConsentSet' | 'onConsentVerified'
		>,
		callbackPayload?: object
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
			const payload = callbackPayload
				? this.createResponseContext<ResponseType>(
						callbackPayload as ResponseType
					)
				: emptyResponse;
			callback(payload);
		}

		return emptyResponse;
	}

	/**
	 * Checks if a consent banner should be shown.
	 * In offline mode, will always return true unless localStorage has a value.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowBannerResponse>
	): Promise<ResponseContext<ShowBannerResponse>> {
		// Check localStorage to see if the banner has been shown
		let shouldShow = true;

		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				// Test localStorage access with a simple operation
				window.localStorage.setItem('c15t-storage-test-key', 'test');
				window.localStorage.removeItem('c15t-storage-test-key');

				const storedConsent = window.localStorage.getItem('c15t-consent');
				shouldShow = storedConsent === null;
			}
		} catch (error) {
			// Ignore localStorage errors (e.g., in environments where it's blocked)
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.warn('Failed to access localStorage:', error);
			// If localStorage is unavailable, default to not showing the banner
			// to prevent repeated failed attempts causing memory leaks
			shouldShow = false;
		}

		const response = this.createResponseContext<ShowBannerResponse>({
			showConsentBanner: shouldShow,
			jurisdiction: {
				code: 'GDPR',
				message: 'EU',
			},
			location: { countryCode: 'GB', regionCode: null },
		});

		// Call specific callback
		if (this.callbacks?.onConsentBannerFetched && response.data) {
			const callbackPayload = this.createResponseContext({
				showConsentBanner: response.data.showConsentBanner,
				jurisdiction: response.data.jurisdiction,
				location: {
					countryCode: response.data.location.countryCode || 'GB',
					regionCode: response.data.location.regionCode || null,
				},
			});

			this.callbacks.onConsentBannerFetched(callbackPayload);
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
		options?: FetchOptions<SetConsentResponse, SetConsentRequest>
	): Promise<ResponseContext<SetConsentResponse>> {
		// Save to localStorage to remember that consent was set
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				// Test localStorage access with a simple operation
				window.localStorage.setItem('c15t-storage-test-key', 'test');
				window.localStorage.removeItem('c15t-storage-test-key');

				window.localStorage.setItem(
					'c15t-consent',
					JSON.stringify({
						timestamp: new Date().toISOString(),
						preferences: options?.body?.preferences || {},
					})
				);
			}
		} catch (error) {
			// Ignore localStorage errors but log them
			// biome-ignore lint/suspicious/noConsole: <explanation>
			console.warn('Failed to write to localStorage:', error);
		}

		// If we couldn't store consent in localStorage, we should
		// still return a successful response to prevent UI errors
		const setConsentCallbackPayload: ConsentSetCallbackPayload = {
			type: options?.body?.type || 'cookie_banner',
			preferences: options?.body?.preferences || {},
			domain: options?.body?.domain || '',
		};

		return await this.handleOfflineResponse<SetConsentResponse>(
			options,
			'onConsentSet',
			setConsentCallbackPayload
		);
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequest>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		const verifiedCallbackPayload: ConsentVerifiedCallbackPayload = {
			type: options?.body?.type || 'cookie_banner',
			preferences: options?.body?.preferences || [],
			valid: true,
			domain: options?.body?.domain || '',
		};

		return await this.handleOfflineResponse<VerifyConsentResponse>(
			options,
			'onConsentVerified',
			verifiedCallbackPayload
		);
	}

	/**
	 * Makes a custom API request to any endpoint.
	 */
	async $fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		_path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		return await this.handleOfflineResponse<ResponseType>(options);
	}
}
