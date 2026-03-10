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
	// Prefer the new `showConsentBanner` handler when available, but fall back
	// to the legacy `init` handler for backwards compatibility.
	const handlerKey: keyof EndpointHandlers =
		'init' in endpointHandlers && endpointHandlers.init !== undefined
			? 'init'
			: 'init';

	return await executeHandler<InitResponse>(
		endpointHandlers,
		handlerKey,
		options
	);
}
