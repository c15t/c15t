/**
 * Shared in-process GVL cache. Honors upstream lifetime and reuse directives,
 * coalesces concurrent requests, and invalidates pending fills when cleared.
 */
import type { GlobalVendorList } from '@c15t/schema/types';

import { parseCacheDirectiveSeconds } from '../libs/cache-directive';
import { failedResponseError } from '../libs/failed-response';

export interface CachedGvl {
	gvl: GlobalVendorList | null;
	expiresAt: number;
	/** The failure being backed off from when no list has loaded. */
	error?: unknown;
	/** `false` when only a failed fetch is remembered and no list has loaded. */
	loaded?: boolean;
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
/**
 * How long a failed fetch is remembered before the next call tries again.
 * A stalled request holds an init for the full fetch timeout, so without
 * this an outage would slow every init, not one a minute.
 */
const FAILURE_BACKOFF_MS = 60_000;
/** Most lists one cache keeps, one per URL and language; the oldest goes first. */
const MAX_ENTRIES = 64;

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

/** Stores `entry` as the newest under `key`, dropping the oldest past the cap. */
const remember = function remember(
	cache: GvlCache,
	key: string,
	entry: CachedGvl
): void {
	cache.delete(key);
	cache.set(key, entry);
	while (cache.size > MAX_ENTRIES) {
		const oldest = cache.keys().next().value;
		if (oldest === undefined) {
			break;
		}
		cache.delete(oldest);
	}
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
 * Fetches a vendor list through the cache. When a refresh fails, by status
 * or by a thrown or aborted fetch, the last good list is served, and the
 * endpoint is not asked again for a minute.
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
	const hasValue = cached !== undefined && cached.loaded !== false;
	if (cached && cached.expiresAt > now) {
		return hasValue
			? Promise.resolve(cached.gvl)
			: Promise.reject(cached.error);
	}
	if (cached && !hasValue) {
		cache.delete(key);
	}

	const inflight = getInflight(cache);
	const pending = inflight.get(key);
	if (pending) {
		return pending;
	}

	const label = options.label ?? 'c15t';
	const current = () => inflightByCache.get(cache) === inflight;
	let settled = false;
	const run = (async () => {
		try {
			const response = await options.fetch(options.url, {
				headers: { 'accept-language': options.language, ...options.headers },
				method: 'GET',
			});
			if (!response.ok && response.status !== 204) {
				throw await failedResponseError(`${label}: GVL`, response);
			}
			const gvl =
				response.status === 204
					? null
					: ((await response.json()) as GlobalVendorList);
			// A cleared cache belongs to newer requests; an old fill cannot repopulate it.
			if (current()) {
				const ttl = ttlFromHeaders(response.headers);
				if (ttl > 0) {
					remember(cache, key, {
						expiresAt: now + ttl * 1000,
						gvl,
						loaded: true,
					});
				} else {
					cache.delete(key);
				}
			}
			return gvl;
		} catch (error) {
			// The backoff runs from the failure, not from when the fetch began.
			const failedAt = options.now ?? Date.now();
			if (current()) {
				if (hasValue) {
					// Keep serving the last good list while backing off from the endpoint.
					remember(cache, key, {
						expiresAt: failedAt + FAILURE_BACKOFF_MS,
						gvl: cached.gvl,
						loaded: true,
					});
				} else {
					remember(cache, key, {
						error,
						expiresAt: failedAt + FAILURE_BACKOFF_MS,
						gvl: null,
						loaded: false,
					});
				}
			}
			if (hasValue) {
				return cached.gvl;
			}
			throw error;
		} finally {
			settled = true;
			inflight.delete(key);
		}
	})();
	// A fetch that throws at once settles the fill before this line.
	// Registering it then would leave a finished fill for every later call.
	if (!settled) {
		inflight.set(key, run);
	}
	return run;
};
