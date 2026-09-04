import type { PrefetchOptions } from '@c15t/core';

export interface C15tPrefetchProps extends PrefetchOptions {
	/**
	 * Optional script element ID.
	 *
	 * @default 'c15t-initial-data-prefetch'
	 */
	id?: string;
}
