/**
 * Server entry point for the GVL cache.
 *
 * Reads and fills the same process cache as `fetchCachedGvl` from
 * `@c15t/core` and `@c15t/core/transports/manifest-cache`, so a route, a
 * server render and a transport in one process never download one list
 * twice. On top of that it supplies what a server needs and a browser
 * bundle should not carry: a default `fetch` and a deadline on the
 * upstream request.
 */
import type { GlobalVendorList } from '@c15t/schema/types';

import type { ManifestFetch } from '../libs/manifest-cache-runtime';
import {
	clearGvlCache as clearDefaultGvlCache,
	fetchCachedGvl as fetchThroughGvlCache,
} from '../transports/gvl-cache';

/**
 * How long a server waits for the Global Vendor List before the request is
 * aborted. The list is large and fetched rarely; a hung upstream must not
 * hold an init route or a server render open.
 */
export const GVL_FETCH_TIMEOUT_MS = 5000;

/** Options for {@link fetchCachedGvl}. */
export interface FetchCachedGvlOptions {
	/** Absolute URL of the vendor list. */
	url: string;
	/** Language to request the list in. Part of the cache key. */
	language: string;
	/** Override fetch, mainly for tests. Defaults to `globalThis.fetch`. */
	fetch?: ManifestFetch;
	/** Extra request headers, such as the c15t protocol headers. */
	headers?: Record<string, string>;
	/** Error prefix naming the caller. */
	label?: string;
	/** Injectable clock, for tests. */
	now?: number;
}

const withDeadline = function withDeadline(
	fetchImpl: ManifestFetch
): typeof globalThis.fetch {
	return ((input: string | URL | Request, init?: RequestInit) =>
		fetchImpl(
			input,
			typeof AbortSignal.timeout === 'function'
				? { ...init, signal: AbortSignal.timeout(GVL_FETCH_TIMEOUT_MS) }
				: init
		)) as typeof globalThis.fetch;
};

/**
 * Fetch a Global Vendor List through the process cache, reusing a cached
 * copy while it is fresh.
 *
 * A `204` is cached as `null`, which is how a backend says "IAB is off for
 * this tenant". The upstream request is aborted after
 * {@link GVL_FETCH_TIMEOUT_MS}; a stale list is served when a refresh
 * fails.
 *
 * @param input - Vendor list URL, language, and a fetch seam.
 * @returns The vendor list, or `null` when the backend serves none.
 * @throws {Error} When no fetch is available, or the upstream fails or
 * times out with no cached list to fall back on.
 * @example
 * ```ts
 * const gvl = await fetchCachedGvl({ language: 'en', url: reference.url });
 * ```
 */
export const fetchCachedGvl = function fetchCachedGvl(
	input: FetchCachedGvlOptions
): Promise<GlobalVendorList | null> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		return Promise.reject(
			new Error('@c15t/core/server: no fetch implementation available.')
		);
	}
	return fetchThroughGvlCache({
		...input,
		fetch: withDeadline(fetchImpl),
		label: input.label ?? '@c15t/core/server',
	});
};

/**
 * Drop every cached vendor list in the process cache.
 *
 * @remarks Test seam; nothing in production needs it.
 */
export const clearGvlCache = function clearGvlCache(): void {
	clearDefaultGvlCache();
};
