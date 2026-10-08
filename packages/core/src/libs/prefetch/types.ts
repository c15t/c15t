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
	 * The consent journey the early `/init` starts, with the same values as
	 * the provider's `journey` option: pass the provider's setting. The id is
	 * kept on the page for the runtime to continue, so the save it sends
	 * carries the same id.
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
