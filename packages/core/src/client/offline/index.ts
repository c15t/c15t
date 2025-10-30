/**
 * Offline implementation of the consent client interface.
 * Returns empty successful responses without making any HTTP requests.
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
import { setConsent } from './set-consent';
import { showConsentBanner } from './show-consent-banner';
import type { OfflineClientOptions } from './types';
import { handleOfflineResponse } from './utils';
import { verifyConsent } from './verify-consent';

/**
 * Offline implementation of the consent client interface.
 * Returns empty successful responses without making any HTTP requests.
 */
export class OfflineClient implements ConsentManagerInterface {
	private readonly storageConfig?: import('../../libs/cookie').StorageConfig;

	constructor(storageConfig?: import('../../libs/cookie').StorageConfig) {
		this.storageConfig = storageConfig;
	}

	/**
	 * Checks if a consent banner should be shown.
	 * In offline mode, will always return true unless localStorage or cookie has a value.
	 */
	async showConsentBanner(
		options?: FetchOptions<ShowConsentBannerResponse>
	): Promise<ResponseContext<ShowConsentBannerResponse>> {
		return showConsentBanner(this.storageConfig, options);
	}

	/**
	 * Sets consent preferences for a subject.
	 * In offline mode, saves to both localStorage and cookie to track that consent was set.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return setConsent(this.storageConfig, options);
	}

	/**
	 * Verifies if valid consent exists.
	 */
	async verifyConsent(
		options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
	): Promise<ResponseContext<VerifyConsentResponse>> {
		return verifyConsent(options);
	}

	/**
	 * Makes a custom API request to any endpoint.
	 */
	async $fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		_path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>> {
		return await handleOfflineResponse<ResponseType>(options);
	}
}

// Re-export types for convenience
export type { OfflineClientOptions } from './types';
