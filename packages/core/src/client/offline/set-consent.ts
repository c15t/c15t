import { saveConsentToStorage } from '../../libs/cookie';
import type {
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { handleOfflineResponse } from './utils';

/**
 * Sets consent preferences for a subject.
 * In offline mode, saves to both localStorage and cookie to track that consent was set.
 */
export async function setConsent(
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>> {
	// Save to localStorage and cookie to remember that consent was set
	try {
		if (typeof window !== 'undefined') {
			saveConsentToStorage(
				{
					consentInfo: {
						time: Date.now(),
						identified: Boolean(options?.body?.externalId),
					},
					consents: options?.body?.preferences || {},
				},
				undefined,
				storageConfig
			);
		}
	} catch (error) {
		// Ignore storage errors but log them
		console.warn('Failed to write to storage:', error);
	}

	return await handleOfflineResponse<SetConsentResponse>(options);
}
