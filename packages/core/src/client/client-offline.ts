import { defaultTranslationConfig } from '~/translations';
import type {
	ConsentManagerInterface,
	SetConsentRequestBody,
	SetConsentResponse,
	ShowConsentBannerResponse,
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from './client-interface';
import type { FetchOptions, ResponseContext } from './types';

/**
 * Configuration options for the Offline client.
 *
 * Currently, there are no configurable options.
 */
export type OfflineClientOptions = Record<string, never>;

/**
 * Offline implementation of the consent client interface.
 * Returns empty successful responses without making any HTTP requests.
 */
export class OfflineClient implements ConsentManagerInterface {
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
		options?: FetchOptions<ResponseType>
	): Promise<ResponseContext<ResponseType>> {
		const emptyResponse = this.createResponseContext<ResponseType>();

		// Call success callback if provided
		if (options?.onSuccess) {
			await options.onSuccess(emptyResponse);
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
				// Test localStorage access with a simple operation
				window.localStorage.setItem('c15t-storage-test-key', 'test');
				window.localStorage.removeItem('c15t-storage-test-key');

				const storedConsent = window.localStorage.getItem('c15t-consent');
				shouldShow = storedConsent === null;
			}
		} catch (error) {
			// Ignore localStorage errors (e.g., in environments where it's blocked)
			console.warn('Failed to access localStorage:', error);
			// If localStorage is unavailable, default to not showing the banner
			// to prevent repeated failed attempts causing memory leaks
			shouldShow = false;
		}

		const response = this.createResponseContext<ShowConsentBannerResponse>({
			showConsentBanner: shouldShow,
			jurisdiction: {
				code: 'GDPR',
				message: 'EU',
			},
			branding: 'c15t',
			location: { countryCode: 'GB', regionCode: null },
			translations: {
				language: defaultTranslationConfig.defaultLanguage,
				translations:
					defaultTranslationConfig.translations[
						defaultTranslationConfig.defaultLanguage ?? 'en'
					],
			},
		});

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
			console.warn('Failed to write to localStorage:', error);
		}

		return await this.handleOfflineResponse<SetConsentResponse>(options);
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		return await this.handleOfflineResponse<VerifyConsentResponse>(options);
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
