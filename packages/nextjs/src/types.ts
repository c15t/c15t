import type { PrefetchOptions } from '@c15t/core';
import type { ConsentProviderPrefetch } from '@c15t/react/provider';

export interface C15tPrefetchProps extends PrefetchOptions {
	/**
	 * Optional script element ID.
	 *
	 * @default 'c15t-initial-data-prefetch'
	 */
	id?: string;
}

/** Serializable policy, records, and request clock shared with the React provider. */
export type InitialConsentConfig = ConsentProviderPrefetch;
