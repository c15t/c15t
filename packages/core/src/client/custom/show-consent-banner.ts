import type { ShowConsentBannerResponse } from '../client-interface';
import type { FetchOptions, ResponseContext } from '../types';
import type { EndpointHandlers } from './types';
import { executeHandler } from './utils';

/**
 * Checks if a consent banner should be shown.
 */
export async function showConsentBanner(
	endpointHandlers: EndpointHandlers,
	options?: FetchOptions<ShowConsentBannerResponse>
): Promise<ResponseContext<ShowConsentBannerResponse>> {
	return await executeHandler<ShowConsentBannerResponse>(
		endpointHandlers,
		'showConsentBanner',
		options
	);
}
