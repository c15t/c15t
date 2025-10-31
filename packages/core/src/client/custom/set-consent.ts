import type {
	SetConsentRequestBody,
	SetConsentResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
import { executeHandler } from './utils';

/**
 * Sets consent preferences for a subject.
 */
export async function setConsent(
	endpointHandlers: EndpointHandlers,
	options?: FetchOptions<SetConsentResponse, SetConsentRequestBody>
): Promise<ResponseContext<SetConsentResponse>> {
	return await executeHandler<SetConsentResponse, SetConsentRequestBody>(
		endpointHandlers,
		'setConsent',
		options
	);
}
