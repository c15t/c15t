import type { Overrides } from '../../options/overrides';
import type { ConsentJourneyOption } from '../journey';

export interface PrefetchOptions {
	/**
	 * Backend URL used for fetching `/init`.
	 * Accepts absolute URLs or same-origin paths like `/api/c15t`.
	 */
	backendURL: string;

	/**
	 * Optional request-level overrides for prefetching init data.
	 */
	overrides?: Pick<Overrides, 'country' | 'region' | 'language' | 'gpc'>;

	/**
	 * Fetch credentials mode.
	 *
	 * @default 'include'
	 */
	credentials?: RequestCredentials;

	/**
	 * The provider's `journey` setting, for the journey this `/init` starts.
	 *
	 * @default 'page'
	 */
	journey?: ConsentJourneyOption;

	/**
	 * The consent storage key, used to tell whether a choice is stored.
	 *
	 * @default 'c15t'
	 */
	storageKey?: string;
}
