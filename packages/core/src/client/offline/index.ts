/**
 * Offline implementation of the consent client interface.
 * Returns empty successful responses without making any HTTP requests.
 *

 */

import type { TranslationConfig } from '../../types';
import type {
	ConsentManagerInterface,
	IdentifyUserRequestBody,
	IdentifyUserResponse,
	InitResponse,
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { init } from './init';
import { setConsent } from './set-consent';
import type { IABFallbackConfig } from './types';
import { handleOfflineResponse } from './utils';

/**
 * Offline implementation of the consent client interface.
 * Returns empty successful responses without making any HTTP requests.
 *
 * @remarks
 * v2.0: Subject-centric API. Use setConsent for all consent operations.
 */
export class OfflineClient implements ConsentManagerInterface {
	private readonly storageConfig?: import('../../libs/cookie').StorageConfig;
	private readonly initialTranslationConfig?: Partial<TranslationConfig>;
	private readonly iabConfig?: IABFallbackConfig;

	constructor(
		storageConfig?: import('../../libs/cookie').StorageConfig,
		initialTranslationConfig?: Partial<TranslationConfig>,
		iabConfig?: IABFallbackConfig
	) {
		this.storageConfig = storageConfig;
		this.initialTranslationConfig = initialTranslationConfig;
		this.iabConfig = iabConfig;
	}

	/**
	 * Checks if a consent banner should be shown.
	 * The location can be controlled via overrides in the store, but defaults to GB.
	 */
	async init(
		options?: FetchOptions<InitResponse>
	): Promise<ResponseContext<InitResponse>> {
		return init(this.initialTranslationConfig, options, this.iabConfig);
	}

	/**
	 * Sets consent preferences for a subject.
	 * In offline mode, saves to both localStorage and cookie to track that consent was set.
	 *
	 * @remarks
	 * v2.0: This stores the client-generated subjectId.
	 */
	async setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>> {
		return setConsent(this.storageConfig, options);
	}

	/**
	 * Links an external user ID to a subject.
	 * In offline mode, this is a no-op that returns success.
	 *
	 * @remarks
	 * v2.0: Offline mode cannot actually link to external ID.
	 */
	async identifyUser(
		options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
	): Promise<ResponseContext<IdentifyUserResponse>> {
		console.warn(
			'identifyUser called in offline mode - external ID will not be linked'
		);
		return handleOfflineResponse<IdentifyUserResponse>(options);
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
