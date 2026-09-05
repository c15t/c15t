/**
 * In-process cache for the IAB Global Vendor List.
 *
 * The list is ~1.5 MB and changes weekly. Without a cache every init that
 * resolves an IAB policy re-downloads it, which is slow and trips the
 * upstream host's rate limiting. Entries live for the upstream `max-age`
 * (one day when absent), concurrent misses share one fetch, and a stale
 * entry is served when a refresh fails.
 */
import type { GlobalVendorList } from '@c15t/schema/types';

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

const DEFAULT_TTL_SECONDS = 86_400;

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
	const directive = (headers.get('cache-control') ?? '')
		.split(',')
		.map((part) => part.trim().toLowerCase())
		.find((part) => part.startsWith('max-age='));
	const seconds = directive
		? Number(directive.slice('max-age='.length))
		: Number.NaN;
	return Number.isFinite(seconds) && seconds > 0
		? seconds
		: DEFAULT_TTL_SECONDS;
};

/** Drops every cached list; the next call fetches again. */
export const clearGvlCache = function clearGvlCache(
	cache: GvlCache = defaultGvlCache
): void {
	cache.clear();
	inflightByCache.get(cache)?.clear();
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
			if (response.status === 204) {
				cache.set(key, {
					expiresAt: now + DEFAULT_TTL_SECONDS * 1000,
					gvl: null,
				});
				return null;
			}
			if (!response.ok) {
				if (cached) {
					// Keep serving the last good list while the upstream misbehaves.
					return cached.gvl;
				}
				throw new Error(
					`${label}: GVL responded ${response.status} ${response.statusText}`
				);
			}
			const gvl = (await response.json()) as GlobalVendorList;
			cache.set(key, {
				expiresAt: now + ttlFromHeaders(response.headers) * 1000,
				gvl,
			});
			return gvl;
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, run);
	return run;
};
