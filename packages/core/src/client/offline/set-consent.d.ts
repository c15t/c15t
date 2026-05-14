import type {
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
/**
 * Sets consent preferences for a subject.
 * In offline mode, saves to both localStorage and cookie to track that consent was set.
 *
 * @remarks
 * v2.0: The body must include a client-generated subjectId.
 */
export declare function setConsent(
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>>;
