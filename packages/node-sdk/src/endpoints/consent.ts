import type { CheckConsentOutput, CheckConsentQuery } from '@c15t/schema/types';
import type { FetcherContext } from '../fetcher';
import { fetcher } from '../fetcher';
import type { FetchOptions, ResponseContext } from '../types';

/**
 * API endpoint path for consent check
 */
export const CONSENT_CHECK_PATH = '/consents/check';

/**
 * Check consent status for an external ID
 *
 * @param context - Fetcher context
 * @param query - Query parameters (externalId required)
 * @param options - Optional fetch options
 * @returns Consent check response
 */
export async function checkConsent(
	context: FetcherContext,
	query: CheckConsentQuery,
	options?: FetchOptions<CheckConsentOutput, never, CheckConsentQuery>
): Promise<ResponseContext<CheckConsentOutput>> {
	return fetcher<CheckConsentOutput, never, CheckConsentQuery>(
		context,
		CONSENT_CHECK_PATH,
		{
			method: 'GET',
			query,
			...options,
		}
	);
}
