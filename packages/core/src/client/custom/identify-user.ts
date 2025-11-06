import type {
	IdentifyUserRequestBody,
	IdentifyUserResponse,
} from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
import { executeHandler } from './utils';

/**
 * Links a subject's external ID to a consent record by consent ID.
 */
export async function identifyUser(
	endpointHandlers: EndpointHandlers,
	options?: FetchOptions<IdentifyUserResponse, IdentifyUserRequestBody>
): Promise<ResponseContext<IdentifyUserResponse>> {
	return await executeHandler<IdentifyUserResponse, IdentifyUserRequestBody>(
		endpointHandlers,
		'identifyUser',
		options
	);
}
