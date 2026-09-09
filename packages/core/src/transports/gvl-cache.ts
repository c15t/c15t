/**
 * Shared in-process GVL cache. Honors upstream lifetime and reuse directives,
 * coalesces concurrent requests, and invalidates pending fills when cleared.
 */
import type { GlobalVendorList } from '@c15t/schema/types';

import { parseCacheDirectiveSeconds } from '../libs/manifest-cache-runtime';

export interface CachedGvl {
	gvl: GlobalVendorList | null;
	expiresAt: number;
}

export type GvlCache = Map<string, CachedGvl>;

export interface FetchCachedGvlOptions {
	/** Vendor list endpoint from the manifest's `iab.gvl.url`. */
	url: string;
	/** Primary language subtag the list should be localised to. */
	language: string;
	fetch: typeof globalThis.fetch;
	/** Extra request headers (version headers, for example). */
	headers?: Record<string, string>;
	/** Error prefix naming the caller. */
	label?: string;
	/** Injected for tests. */
	now?: number;
	cache?: GvlCache;
}

const DEFAULT_TTL_SECONDS = 5;

const defaultGvlCache: GvlCache = new Map();
const inflightByCache = new WeakMap<
	GvlCache,
	Map<string, Promise<GlobalVendorList | null>>
>();

const getInflight = function getInflight(cache: GvlCache) {
	let inflight = inflightByCache.get(cache);
	if (!inflight) {
		inflight = new Map();
		inflightByCache.set(cache, inflight);
	}
	return inflight;
};

const ttlFromHeaders = function ttlFromHeaders(headers: Headers): number {
	const cacheControl = headers.get('cache-control');
	if (
		cacheControl
			?.split(',')
			.some((part) =>
				['no-store', 'no-cache', 'private'].includes(
					part.trim().split('=')[0]?.toLowerCase() ?? ''
				)
			)
	) {
		return 0;
	}
	const ttl =
		parseCacheDirectiveSeconds(cacheControl, 's-maxage') ??
		parseCacheDirectiveSeconds(cacheControl, 'max-age') ??
		DEFAULT_TTL_SECONDS;
	const age = Number(headers.get('age') ?? 0);
	return Math.max(0, ttl - (Number.isFinite(age) && age > 0 ? age : 0));
};

/** Drops every cached list; the next call fetches again. */
export const clearGvlCache = function clearGvlCache(
	cache: GvlCache = defaultGvlCache
): void {
	cache.clear();
	inflightByCache.delete(cache);
};

/**
 * Fetches a vendor list through the cache.
 *
 * @param options - Endpoint, language, and fetch implementation.
 * @returns The list, or `null` when the endpoint answered 204.
 * @throws {Error} When the endpoint fails and no stale entry exists.
 */
export const fetchCachedGvl = function fetchCachedGvl(
	options: FetchCachedGvlOptions
): Promise<GlobalVendorList | null> {
	const cache = options.cache ?? defaultGvlCache;
	const now = options.now ?? Date.now();
	const key = `${options.url}|${options.language}`;
	const cached = cache.get(key);
	if (cached && cached.expiresAt > now) {
		return Promise.resolve(cached.gvl);
	}

	const inflight = getInflight(cache);
	const pending = inflight.get(key);
	if (pending) {
		return pending;
	}

	const label = options.label ?? 'c15t';
	const run = (async () => {
		try {
			const response = await options.fetch(options.url, {
				headers: { 'accept-language': options.language, ...options.headers },
				method: 'GET',
			});
			if (!response.ok && response.status !== 204) {
				if (cached) {
					// Keep serving the last good list while the upstream misbehaves.
					return cached.gvl;
				}
				throw new Error(
					`${label}: GVL responded ${response.status} ${response.statusText}`
				);
			}
			const gvl =
				response.status === 204
					? null
					: ((await response.json()) as GlobalVendorList);
			// A cleared cache belongs to newer requests; an old fill cannot repopulate it.
			if (inflightByCache.get(cache) === inflight) {
				const ttl = ttlFromHeaders(response.headers);
				if (ttl > 0) {
					cache.set(key, { expiresAt: now + ttl * 1000, gvl });
				} else {
					cache.delete(key);
				}
			}
			return gvl;
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, run);
	return run;
};
