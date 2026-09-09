/** Server entrypoint for the shared GVL cache implementation. */
import type { GlobalVendorList } from '@c15t/schema/types';

import {
	clearGvlCache as clearCache,
	fetchCachedGvl as fetchGvl,
} from '../transports/gvl-cache';
import type { GvlCache } from '../transports/gvl-cache';
import type { ManifestFetch } from './manifest-cache';

const cache: GvlCache = new Map();

/** Options for {@link fetchCachedGvl}. */
export interface FetchCachedGvlOptions {
	/** Absolute URL of the vendor list. */
	url: string;
	/** Language to request the list in. Part of the cache key. */
	language: string;
	/** Override fetch, mainly for tests. */
	fetch?: ManifestFetch;
	/** Injectable clock, for tests. */
	now?: number;
}

/**
 * Fetch a Global Vendor List, reusing a cached copy while it is fresh.
 *
 * A `204` is cached as `null`, which is how a backend says "IAB is off for
 * this tenant" — repeating that fetch on every render costs the same
 * roundtrip as a hit.
 *
 * @param input - Vendor list URL, language, and a fetch seam.
 * @returns The vendor list, or `null` when the backend serves none.
 * @throws {Error} When no fetch is available or an unsuccessful response has no cached fallback.
 * @example
 * ```ts
 * const gvl = await fetchCachedGvl({ language: 'en', url: reference.url });
 * ```
 */
export const fetchCachedGvl = async function fetchCachedGvl(
	input: FetchCachedGvlOptions
): Promise<GlobalVendorList | null> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('@c15t/core/server: no fetch implementation available.');
	}

	return await fetchGvl({
		...input,
		cache,
		fetch: fetchImpl,
		label: '@c15t/core/server',
	});
};

/**
 * Drop every cached vendor list.
 *
 * @remarks Test seam; nothing in production needs it.
 */
export const clearGvlCache = function clearGvlCache(): void {
	clearCache(cache);
};
