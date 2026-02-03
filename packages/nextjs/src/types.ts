import type { ConsentManagerProviderProps } from '@c15t/react';
import type { FetchSSRDataOptionsBase } from '@c15t/react/server';

export type InitialDataPromise = NonNullable<
	ConsentManagerProviderProps['options']['store']
>['ssrData'];

/**
 * Options for the fetchInitialData function.
 *
 * @remarks
 * Uses the base options from @c15t/react/server - headers are
 * resolved automatically from Next.js.
 */
export type FetchInitialDataOptions = FetchSSRDataOptionsBase;

export interface ConsentManagerProps {
	children: React.ReactNode;
	initialData?: InitialDataPromise;
}
