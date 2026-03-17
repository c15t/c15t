import type { ConsentManagerProviderProps } from '@c15t/react';
import type { FetchSSRDataOptionsBase } from '@c15t/react/server';
import type { Overrides } from 'c15t';

export type InitialDataPromise = NonNullable<
	ConsentManagerProviderProps['options']['store']
>['ssrData'];

export interface NextCacheOptions {
	/**
	 * Cache lifetime in seconds for the Next.js data cache.
	 * Set to false to disable Next.js caching for this call.
	 *
	 * @default 1
	 */
	revalidateSeconds?: number | false;
}

export interface BrowserInitialDataOptions {
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

export interface PrefetchC15TProps extends BrowserInitialDataOptions {
	/**
	 * Optional script element ID.
	 *
	 * @default 'c15t-initial-data-prefetch'
	 */
	id?: string;
}

/**
 * Options for the fetchInitialData function.
 *
 * @remarks
 * Uses the base options from @c15t/react/server - headers are
 * resolved automatically from Next.js.
 */
export interface FetchInitialDataOptions extends FetchSSRDataOptionsBase {
	/**
	 * Optional Next.js cache controls for SSR init requests.
	 */
	nextCache?: NextCacheOptions;
}

export interface ConsentManagerProps {
	children: React.ReactNode;
	ssrData?: InitialDataPromise;
}
