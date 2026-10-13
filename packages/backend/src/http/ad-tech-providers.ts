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

/**
 * In-flight requests, keyed like the cache, so a cold cache under load costs
 * one upstream fetch.
 */
const inflight = new Map<string, Promise<AdTechProvider[] | null>>();

/**
 * The last list fetched per key, for when the upstream fails and the cache
 * has nothing either (no adapter configured, or its entries expired).
 */
const lastGood = new Map<string, AdTechProvider[]>();

/** When each key may next try the upstream after a failed fetch. */
const retryAfter = new Map<string, number>();

/** The cache key that keeps a list past its freshness, for failed refreshes. */
const staleCacheKey = function staleCacheKey(key: string): string {
	return `${key}|stale`;
};

const rememberLastGood = function rememberLastGood(
	key: string,
	providers: AdTechProvider[]
): void {
	lastGood.delete(key);
	lastGood.set(key, providers);
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
		inflight.clear();
		lastGood.clear();
		retryAfter.clear();
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
	key: string,
	providers: AdTechProvider[]
): Promise<void> {
	const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
	try {
		await Promise.all([
			options.cache?.set(key, providers, ttlMs),
			options.cache?.set(
				staleCacheKey(key),
				providers,
				Math.max(ttlMs, STALE_TTL_MS)
			),
		]);
	} catch {
		// The list just fetched is still served.
	}
};

/** The last list fetched for a key, from memory or the cache's stale entry. */
const readStaleProviders = async function readStaleProviders(
	cache: CacheAdapter | undefined,
	key: string
): Promise<AdTechProvider[] | null> {
	return (
		lastGood.get(key) ?? (await readCachedProviders(cache, staleCacheKey(key)))
	);
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

	const cached = await readCachedProviders(options.cache, key);
	if (cached) {
		return cached;
	}
	if (Date.now() < (retryAfter.get(key) ?? 0)) {
		return readStaleProviders(options.cache, key);
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
				return readStaleProviders(options.cache, key);
			}
			retryAfter.delete(key);
			rememberLastGood(key, providers);
			await cacheProviders(options, key, providers);
			return providers;
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, request);
	return request;
};
