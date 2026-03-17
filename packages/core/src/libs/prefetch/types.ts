import type { Overrides } from '../../types';

export interface PrefetchOptions {
	/**
	 * Backend URL used for fetching `/init`.
	 * Accepts absolute URLs or same-origin paths like `/api/c15t`.
	 */
	backendURL: string;

	/**
	 * Optional request-level overrides for prefetching init data.
	 */
	overrides?: Pick<Overrides, 'country' | 'region' | 'language'>;

	/**
	 * Fetch credentials mode.
	 *
	 * @default 'include'
	 */
	credentials?: RequestCredentials;
}
