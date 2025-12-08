import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
import { executeHandler } from './utils';

/**
 * Initializes consent manager by fetching jurisdiction, location, translations, and branding information.
 */
export async function init(
	endpointHandlers: EndpointHandlers,
	options?: FetchOptions<InitResponse>
): Promise<ResponseContext<InitResponse>> {
	return await executeHandler<InitResponse>(endpointHandlers, 'init', options);
}
