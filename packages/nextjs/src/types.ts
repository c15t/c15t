import type { ConsentManagerProviderProps } from '@c15t/react';
import type { FetchSSRDataOptionsBase } from '@c15t/react/server';
import type { PrefetchOptions } from 'c15t';

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

export interface C15tPrefetchProps extends PrefetchOptions {
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
