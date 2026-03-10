import type { InitOutput } from '@c15t/schema/types';
import type { FetcherContext } from '../fetcher';
import { fetcher } from '../fetcher';
import type { FetchOptions, ResponseContext } from '../types';

/**
 * API endpoint path for init
 */
export const INIT_PATH = '/init';

/**
 * Initialize consent manager
 *
 * @param context - Fetcher context
 * @param options - Optional fetch options
 * @returns Init response with jurisdiction, location, translations, branding
 */
export async function init(
	context: FetcherContext,
	options?: FetchOptions<InitOutput>
): Promise<ResponseContext<InitOutput>> {
	return fetcher<InitOutput>(context, INIT_PATH, {
		method: 'GET',
		...options,
	});
}
