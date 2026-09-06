/**
 * Shared server-side Global Vendor List fetch + in-process cache.
 *
 * The GVL is the largest thing an IAB page needs and the least likely to
 * change — IAB Europe publishes a new list a few times a month, and every
 * visitor in a language gets the identical bytes. Yet every host layer
 * that resolves `/init` on the server fetched it per request, because the
 * fetcher was a one-line `GET` inlined in each of them.
 *
 * This is that `GET` with the same in-process cache the manifest already
 * has, keyed by URL and language: concurrent renders collapse onto one
 * upstream call, and later ones reuse the entry until the backend's
 * `Cache-Control` says not to.
 *
 * It is a dedupe layer, never a CDN substitute.
 */

import type { GlobalVendorList } from '@c15t/schema/types';

import type { ManifestFetch } from './manifest-cache';
import {
	getManifestSMaxAge,
	MANIFEST_DEDUPE_TTL_SECONDS,
} from './manifest-cache';

interface GvlCacheEntry {
	/** `null` is a real answer: the backend disabled IAB for this request. */
	gvl: GlobalVendorList | null;
	expiresAt: number;
}

const gvlCache = new Map<string, GvlCacheEntry>();
const inFlight = new Map<string, Promise<GlobalVendorList | null>>();

const cacheKey = function cacheKey(url: string, language: string): string {
	return `${language}\u0000${url}`;
};

const forbidsReuse = function forbidsReuse(
	cacheControl: string | null
): boolean {
	if (!cacheControl) {
		return false;
	}
	return cacheControl
		.split(',')
		.some((part) =>
			['no-store', 'no-cache', 'private'].includes(
				part.trim().split('=')[0]?.toLowerCase() ?? ''
			)
		);
};

const resolveTtlSeconds = function resolveTtlSeconds(
	cacheControl: string | null
): number {
	const sMaxAge = getManifestSMaxAge(cacheControl ?? undefined);
	if (sMaxAge > 0) {
		return sMaxAge;
	}
	return forbidsReuse(cacheControl) ? 0 : MANIFEST_DEDUPE_TTL_SECONDS;
};

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
 * @throws {Error} When no fetch is available or the upstream responds
 * non-2xx.
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

	const key = cacheKey(input.url, input.language);
	const now = input.now ?? Date.now();
	const cached = gvlCache.get(key);
	if (cached && cached.expiresAt > now) {
		return cached.gvl;
	}

	// Renders on one server are concurrent, so without this the first N
	// requests after an expiry each start their own download of a list that
	// runs to several megabytes.
	const pending = inFlight.get(key);
	if (pending) {
		return await pending;
	}

	const request = (async () => {
		const response = await fetchImpl(input.url, {
			headers: { 'accept-language': input.language },
			method: 'GET',
		});
		if (!(response.ok || response.status === 204)) {
			throw new Error(
				`@c15t/core/server: GVL responded ${response.status} ${response.statusText}`
			);
		}
		const gvl =
			response.status === 204
				? null
				: ((await response.json()) as GlobalVendorList);
		const ttl = resolveTtlSeconds(response.headers.get('cache-control'));
		if (ttl > 0) {
			gvlCache.set(key, { expiresAt: now + ttl * 1000, gvl });
		} else {
			gvlCache.delete(key);
		}
		return gvl;
	})();

	inFlight.set(key, request);
	try {
		return await request;
	} finally {
		inFlight.delete(key);
	}
};

/**
 * Drop every cached vendor list.
 *
 * @remarks Test seam; nothing in production needs it.
 */
export const clearGvlCache = function clearGvlCache(): void {
	gvlCache.clear();
	inFlight.clear();
};
