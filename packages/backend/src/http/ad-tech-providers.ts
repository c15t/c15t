/**
 * Google Additional Consent provider resolution for IAB deployments.
 *
 * Google publishes the ad tech providers that are not on the Global Vendor
 * List as a CSV that browsers cannot read (it has no CORS headers), and the
 * preference centre needs each provider's name and privacy policy before the
 * AC string may list it as disclosed. The list changes at most daily and is
 * the same for every visitor, so it is resolved here like the vendor list:
 * cached, with concurrent misses sharing one fetch, and served on `/init`.
 *
 * Which providers to resolve is publisher content and lives in the manifest
 * (`iab.additionalConsent`), so a host resolving `/init` from the manifest
 * discloses the same providers. This module only loads them.
 */

import {
	adTechProviderFetchSignal,
	adTechProviderListUrl,
	normalizeAdTechProviderIds,
	parseAdTechProviderList,
} from '@c15t/schema';
import type { AdTechProvider } from '@c15t/schema';

import type { CacheAdapter } from '../cache/types';

/**
 * How the backend loads Google Additional Consent providers. The providers
 * themselves are configured in the manifest's `iab.additionalConsent`.
 */
export interface AdditionalConsentConfig {
	/** Defaults to the `gvl` cache, under separate keys. */
	readonly cache?: CacheAdapter;
	/** How long a fetched list stays fresh. Defaults to one day. */
	readonly ttlMs?: number;
	/** Injected in tests; defaults to global fetch. */
	readonly fetch?: typeof globalThis.fetch;
	/**
	 * Decline to serve providers even when the manifest lists them.
	 *
	 * Absent or `true` follows the manifest; only `false` refuses.
	 */
	readonly enabled?: boolean;
}

export interface AdTechProviderOptions {
	/** Google ATP IDs from the manifest. */
	readonly providers: readonly number[];
	/** Provider list endpoint from the manifest. */
	readonly url: string;
	readonly cache?: CacheAdapter;
	readonly ttlMs?: number;
	readonly fetch?: typeof globalThis.fetch;
}

const DEFAULT_TTL_MS = 86_400_000;

/**
 * How long the last list fetched is kept for when a refresh fails. Google
 * rarely removes a provider, so a month-old list discloses the same names and
 * policies as today's for nearly every site.
 */
const STALE_TTL_MS = 30 * DEFAULT_TTL_MS;

/**
 * How long a failed fetch is remembered before the next request tries again.
 * A request that times out holds `/init` for
 * `AD_TECH_PROVIDER_FETCH_TIMEOUT_MS`, so without this an upstream outage
 * would slow every `/init` rather than one per minute.
 */
const FAILURE_BACKOFF_MS = 60_000;

/** Most lists kept in memory. Each configuration resolves one set of IDs. */
const MAX_LAST_GOOD_ENTRIES = 32;

/**
 * Cache key. IDs are sorted first, so the same set in another order shares
 * an entry.
 */
export const adTechProviderCacheKey = function adTechProviderCacheKey(
	url: string,
	ids: readonly number[]
): string {
	return `ac:${url}|${normalizeAdTechProviderIds(ids).join(',')}`;
};

/** What this process remembers about provider lists between requests. */
interface AdTechProviderState {
	/**
	 * In-flight requests, keyed like the cache, so a cold cache under load
	 * costs one upstream fetch.
	 */
	readonly inflight: Map<string, Promise<AdTechProvider[] | null>>;
	/**
	 * The last list fetched per key, for when the upstream fails and the cache
	 * has nothing either (no adapter configured, or its entries expired). Each
	 * entry lasts as long as the cache's stale entry, so a long-running process
	 * stops serving an outdated list when a restarted one would.
	 */
	readonly lastGood: Map<
		string,
		{ providers: AdTechProvider[]; staleUntil: number }
	>;
	/** When each key may next try the upstream after a failed fetch. */
	readonly retryAfter: Map<string, number>;
	/**
	 * The cache for a relative endpoint, in place of the configured one. A
	 * shared adapter (Redis, KV) cannot tell two fetch implementations apart,
	 * so it would hand one tenant another's list under the same key.
	 */
	readonly cache?: CacheAdapter;
}

const createState = function createState(): AdTechProviderState {
	return { inflight: new Map(), lastGood: new Map(), retryAfter: new Map() };
};

/** An in-memory cache private to one relative endpoint's state. */
const createStateCache = function createStateCache(): CacheAdapter {
	const entries = new Map<string, { value: unknown; expiresAt: number }>();
	const live = (key: string) => {
		const entry = entries.get(key);
		if (entry && entry.expiresAt <= Date.now()) {
			entries.delete(key);
			return undefined;
		}
		return entry;
	};
	return {
		delete: (key) => {
			entries.delete(key);
			return Promise.resolve();
		},
		get: <ValueType>(key: string) =>
			Promise.resolve((live(key)?.value as ValueType | undefined) ?? null),
		has: (key) => Promise.resolve(live(key) !== undefined),
		set: (key, value, ttlMs = DEFAULT_TTL_MS) => {
			entries.delete(key);
			entries.set(key, { expiresAt: Date.now() + ttlMs, value });
			// A fresh and a stale entry per configuration.
			if (entries.size > 2 * MAX_LAST_GOOD_ENTRIES) {
				const oldest = entries.keys().next().value;
				if (oldest !== undefined) {
					entries.delete(oldest);
				}
			}
			return Promise.resolve();
		},
	};
};

/** State for absolute endpoints, which name the same list for every caller. */
let sharedState = createState();

/**
 * State for relative endpoints, one per fetch implementation. Which list a
 * relative URL names depends on how that fetch resolves it, so two backends
 * in one process (two tenants, say) must not share an entry.
 */
let relativeStates = new WeakMap<
	typeof globalThis.fetch,
	AdTechProviderState
>();

const isAbsoluteUrl = (url: string): boolean =>
	/^[a-z][a-z\d+.-]*:/iu.test(url);

const stateFor = function stateFor(
	options: AdTechProviderOptions
): AdTechProviderState {
	if (isAbsoluteUrl(options.url)) {
		return sharedState;
	}
	const doFetch = options.fetch ?? globalThis.fetch;
	let state = relativeStates.get(doFetch);
	if (!state) {
		state = { ...createState(), cache: createStateCache() };
		relativeStates.set(doFetch, state);
	}
	return state;
};

/** The cache key that keeps a list past its freshness, for failed refreshes. */
const staleCacheKey = function staleCacheKey(key: string): string {
	return `${key}|stale`;
};

/** How long a fetched list may be served after a failed refresh. */
const staleTtlMs = function staleTtlMs(options: AdTechProviderOptions): number {
	return Math.max(options.ttlMs ?? DEFAULT_TTL_MS, STALE_TTL_MS);
};

const rememberLastGood = function rememberLastGood(
	{ lastGood }: AdTechProviderState,
	key: string,
	providers: AdTechProvider[],
	ttlMs: number
): void {
	lastGood.delete(key);
	lastGood.set(key, { providers, staleUntil: Date.now() + ttlMs });
	if (lastGood.size > MAX_LAST_GOOD_ENTRIES) {
		const oldest = lastGood.keys().next().value;
		if (oldest !== undefined) {
			lastGood.delete(oldest);
		}
	}
};

/** Clears in-memory lists and failure backoff. For tests. */
export const resetAdTechProviderState =
	function resetAdTechProviderState(): void {
		sharedState = createState();
		relativeStates = new WeakMap();
	};

/**
 * Loads the list from upstream.
 *
 * @returns The listed providers, or null when the request fails, stalls or
 *   answers with something other than a provider list.
 */
const fetchAdTechProviderList = async function fetchAdTechProviderList(
	options: AdTechProviderOptions,
	ids: readonly number[]
): Promise<AdTechProvider[] | null> {
	try {
		const doFetch = options.fetch ?? globalThis.fetch;
		const response = await doFetch(adTechProviderListUrl(options.url, ids), {
			signal: adTechProviderFetchSignal(),
		});
		return response.ok
			? parseAdTechProviderList(await response.json(), ids)
			: null;
	} catch {
		return null;
	}
};

/** A cache read that throws counts as a miss. */
const readCachedProviders = async function readCachedProviders(
	cache: CacheAdapter | undefined,
	key: string
): Promise<AdTechProvider[] | null> {
	try {
		return (await cache?.get<AdTechProvider[]>(key)) ?? null;
	} catch {
		return null;
	}
};

/** A cache write that throws costs the next request a fetch, nothing more. */
const cacheProviders = async function cacheProviders(
	options: AdTechProviderOptions,
	cache: CacheAdapter | undefined,
	key: string,
	providers: AdTechProvider[]
): Promise<void> {
	const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
	try {
		await Promise.all([
			cache?.set(key, providers, ttlMs),
			cache?.set(staleCacheKey(key), providers, staleTtlMs(options)),
		]);
	} catch {
		// The list just fetched is still served.
	}
};

/** The last list fetched for a key, from memory or the cache's stale entry. */
const readStaleProviders = function readStaleProviders(
	{ lastGood }: AdTechProviderState,
	cache: CacheAdapter | undefined,
	key: string
): Promise<AdTechProvider[] | null> {
	const remembered = lastGood.get(key);
	if (remembered && remembered.staleUntil > Date.now()) {
		return Promise.resolve(remembered.providers);
	}
	lastGood.delete(key);
	return readCachedProviders(cache, staleCacheKey(key));
};

/**
 * Fetches names and privacy policy links for the configured providers, from
 * cache where possible.
 *
 * When the upstream is unavailable, the last list fetched is served instead,
 * and the upstream is not tried again for a minute. With no earlier list it
 * returns null rather than throwing: the AC string only supplements the TC
 * string, and a thrown error would fail `/init` and leave the visitor with no
 * consent UI at all. For the same reason a broken cache only costs a fetch.
 *
 * A relative endpoint keeps its state and cache per fetch implementation,
 * since each may resolve it to a different list. The configured cache is
 * for absolute endpoints only.
 *
 * @param options - Providers and endpoint from the manifest, plus loading options.
 * @returns The listed providers sorted by ID, `[]` when none of the
 *   configured IDs is listed, or null when no list could be loaded.
 */
export const resolveAdTechProviders = async function resolveAdTechProviders(
	options: AdTechProviderOptions
): Promise<AdTechProvider[] | null> {
	const ids = normalizeAdTechProviderIds(options.providers);
	if (ids.length === 0) {
		return [];
	}
	const key = adTechProviderCacheKey(options.url, ids);
	const state = stateFor(options);
	const { inflight, retryAfter } = state;
	const cache = state.cache ?? options.cache;

	const cached = await readCachedProviders(cache, key);
	if (cached) {
		return cached;
	}
	if (Date.now() < (retryAfter.get(key) ?? 0)) {
		return readStaleProviders(state, cache, key);
	}
	const existing = inflight.get(key);
	if (existing) {
		return existing;
	}

	const request = (async () => {
		try {
			const providers = await fetchAdTechProviderList(options, ids);
			if (!providers) {
				retryAfter.set(key, Date.now() + FAILURE_BACKOFF_MS);
				return readStaleProviders(state, cache, key);
			}
			retryAfter.delete(key);
			rememberLastGood(state, key, providers, staleTtlMs(options));
			await cacheProviders(options, cache, key, providers);
			return providers;
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, request);
	return request;
};
