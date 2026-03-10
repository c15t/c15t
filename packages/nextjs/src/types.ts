import type { ConsentManagerProviderProps } from '@c15t/react';
import type { FetchSSRDataOptionsBase } from '@c15t/react/server';

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
