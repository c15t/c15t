import type { StatusOutput } from '@c15t/schema/types';
import type { FetcherContext } from '../fetcher';
import { fetcher } from '../fetcher';
import type { FetchOptions, ResponseContext } from '../types';

/**
 * API endpoint path for status
 */
export const STATUS_PATH = '/status';

/**
 * Get API status
 *
 * @param context - Fetcher context
 * @param options - Optional fetch options
 * @returns Status response
 */
export async function status(
	context: FetcherContext,
	options?: FetchOptions<StatusOutput>
): Promise<ResponseContext<StatusOutput>> {
	return fetcher<StatusOutput>(context, STATUS_PATH, {
		method: 'GET',
		...options,
	});
}
