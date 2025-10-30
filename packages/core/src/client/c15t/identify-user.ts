import { getConsentFromStorage, saveConsentToStorage } from '../../libs/cookie';
import type { ConsentInfo } from '../../types/gdpr';
import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { fetcher } from './fetcher';

interface StoredConsent {
	consents: Record<string, boolean>;
	consentInfo: ConsentInfo | null;
}

/**
 * Links a subject's external ID to a consent record by consent ID.
 */
export async function identifyUser(
	context: FetcherContext,
	storageConfig: import('../../libs/cookie').StorageConfig | undefined,
	options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>> {
	const response = await fetcher<IdentifyUserResponse, IdentifyUserRequestBody>(
		context,
		API_ENDPOINTS.IDENTIFY_CONSENT,
		{
			method: 'PATCH',
			...options,
		}
	);

	// If the request was successful, update stored consent to mark as identified
	if (response.ok && response.data) {
		try {
			if (typeof window !== 'undefined') {
				// Read existing consent data
				const existingData =
					getConsentFromStorage<StoredConsent>(storageConfig);

				if (existingData?.consentInfo) {
					// Update consent info to mark as identified
					saveConsentToStorage(
						{
							consents: existingData.consents || {},
							consentInfo: {
								...existingData.consentInfo,
								identified: true,
								time: existingData.consentInfo.time ?? Date.now(),
							},
						},
						undefined,
						storageConfig
					);
				} else if (existingData) {
					// If consent exists but no consentInfo, create one
					saveConsentToStorage(
						{
							consents: existingData.consents || {},
							consentInfo: {
								identified: true,
								time: Date.now(),
							},
						},
						undefined,
						storageConfig
					);
				}
			}
		} catch (error) {
			// Don't fail the request if storage update fails, just log a warning
			console.warn(
				'Failed to update consent storage after identification:',
				error
			);
		}
	}

	return response;
}
