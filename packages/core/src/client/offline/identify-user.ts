import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import { handleOfflineResponse } from './utils';

/**
 * Links a subject's external ID to a consent record by consent ID.
 */
export async function identifyUser(
	options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>> {
	return await handleOfflineResponse<IdentifyUserResponse>(options);
}
