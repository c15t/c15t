import type {
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { API_ENDPOINTS } from '../types';
import type { FetcherContext } from './fetcher';
import { fetcher } from './fetcher';

/**
 * Verifies if valid consent exists.
 */
export async function verifyConsent(
	context: FetcherContext,
	options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
): Promise<ResponseContext<VerifyConsentResponse>> {
	const response = await fetcher<
		VerifyConsentResponse,
		VerifyConsentRequestBody
	>(context, API_ENDPOINTS.VERIFY_CONSENT, {
		method: 'POST',
		...options,
	});

	return response;
}
