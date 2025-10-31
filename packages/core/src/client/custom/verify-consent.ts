import type {
	VerifyConsentRequestBody,
	VerifyConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
import { executeHandler } from './utils';

/**
 * Verifies if valid consent exists.
 */
export async function verifyConsent(
	endpointHandlers: EndpointHandlers,
	options?: FetchOptions<VerifyConsentResponse, VerifyConsentRequestBody>
): Promise<ResponseContext<VerifyConsentResponse>> {
	return await executeHandler<VerifyConsentResponse, VerifyConsentRequestBody>(
		endpointHandlers,
		'verifyConsent',
		options
	);
}
