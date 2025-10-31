import type {
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { handleOfflineResponse } from './utils';

/**
 * Verifies if valid consent exists.
 */
export async function verifyConsent(
	options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
): Promise<ResponseContext<VerifyConsentResponse>> {
	return await handleOfflineResponse<VerifyConsentResponse>(options);
}
