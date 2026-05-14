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
import type { IABFallbackConfig, OfflineClientOptions } from './types';
/**
 * Offline implementation of the consent client interface.
 * Returns empty successful responses without making any HTTP requests.
 *
 * @remarks
 * v2.0: Subject-centric API. Use setConsent for all consent operations.
 */
export declare class OfflineClient implements ConsentManagerInterface {
	private readonly storageConfig?;
	private readonly initialTranslationConfig?;
	private readonly iabConfig?;
	private readonly policyConfig?;
	constructor(
		storageConfig?: import('../../libs/cookie').StorageConfig,
		initialTranslationConfig?: Partial<TranslationConfig>,
		iabConfig?: IABFallbackConfig,
		policyConfig?: OfflineClientOptions['policyConfig']
	);
	/**
	 * Checks if a consent banner should be shown.
	 * The location can be controlled via overrides in the store, but defaults to GB.
	 */
	init(
		options?: FetchOptions<InitResponse>
	): Promise<ResponseContext<InitResponse>>;
	/**
	 * Sets consent preferences for a subject.
	 * In offline mode, saves to both localStorage and cookie to track that consent was set.
	 *
	 * @remarks
	 * v2.0: This stores the client-generated subjectId.
	 */
	setConsent(
		options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
	): Promise<ResponseContext<SetConsentResponse>>;
	/**
	 * Links an external user ID to a subject.
	 * In offline mode, this is a no-op that returns success.
	 *
	 * @remarks
	 * v2.0: Offline mode cannot actually link to external ID.
	 */
	identifyUser(
		options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
	): Promise<ResponseContext<IdentifyUserResponse>>;
	/**
	 * Makes a custom API request to any endpoint.
	 */
	$fetch<ResponseType, BodyType = unknown, QueryType = unknown>(
		_path: string,
		options?: FetchOptions<ResponseType, BodyType, QueryType>
	): Promise<ResponseContext<ResponseType>>;
}
export type { OfflineClientOptions } from './types';
