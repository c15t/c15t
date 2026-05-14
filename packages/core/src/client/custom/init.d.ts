import type { InitResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
/**
 * Initializes consent manager by fetching jurisdiction, location, translations, and branding information.
 */
export declare function init(
	endpointHandlers: EndpointHandlers,
	options?: FetchOptions<InitResponse>
): Promise<ResponseContext<InitResponse>>;
