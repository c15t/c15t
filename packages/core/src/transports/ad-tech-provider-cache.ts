/**
 * Google Additional Consent providers for hosts that resolve `/init` from a
 * manifest. The backend embeds them in its own `/init`; a manifest host loads
 * them from the manifest's `iab.additionalConsent.url`, as it loads the
 * vendor list from `iab.gvl.url`.
 *
 * Unlike the vendor list, a failure never rejects: the Additional Consent
 * string only supplements the TC String, so an unavailable list leaves the
 * field out and the consent surface still renders.
 */
import {
	adTechProviderFetchSignal,
	adTechProviderListUrl,
	normalizeAdTechProviderIds,
	parseAdTechProviderList,
} from '@c15t/schema/types';
import type {
	AdTechProvider,
	ConsentManifest,
	ConsentManifestAdditionalConsent,
	InitOutput,
} from '@c15t/schema/types';

interface CachedProviders {
	/** Absent when no list has loaded and only a failed fetch is remembered. */
	providers: AdTechProvider[] | undefined;
	/**
	 * Until when this entry is served without asking the endpoint again:
	 * the list's freshness, or the backoff after a failed fetch.
	 */
	expiresAt: number;
	/** Until when the list is served when a refresh fails. */
	staleUntil: number;
}

export type AdTechProviderCache = Map<string, CachedProviders>;

export interface FetchCachedAdTechProvidersOptions {
	/** The manifest's `iab.additionalConsent`. */
	reference: ConsentManifestAdditionalConsent;
	fetch: typeof globalThis.fetch;
	/** Extra request headers (version headers, for example). */
	headers?: Record<string, string>;
	/** Injected for tests. */
	now?: number;
	cache?: AdTechProviderCache;
}

const TTL_MS = 86_400_000;
/**
 * How long a list is kept for failed refreshes, as long as the backend keeps
 * its own. Past that, an endpoint that stays down stops disclosing providers
 * Google may have removed.
 */
const STALE_TTL_MS = 30 * TTL_MS;
/**
 * How long a failed fetch is remembered before the next init tries again, as
 * in the backend. A stalled request holds an init for the full fetch timeout,
 * so without this an endpoint outage would slow every init, not one a minute.
 */
const FAILURE_BACKOFF_MS = 60_000;
/** Lists from absolute endpoints, which name the same list for every caller. */
const sharedCache: AdTechProviderCache = new Map();
/**
 * Lists from relative endpoints, one cache per fetch implementation. Which
 * list a relative URL names depends on how that fetch resolves it, so two
 * resolvers in one process (two tenants, say) must not share an entry.
 */
let relativeCaches = new WeakMap<
	typeof globalThis.fetch,
	AdTechProviderCache
>();
const inflightByCache = new WeakMap<
	AdTechProviderCache,
	Map<string, Promise<AdTechProvider[] | undefined>>
>();

const isAbsoluteUrl = (url: string): boolean =>
	/^[a-z][a-z\d+.-]*:/iu.test(url);

const cacheFor = function cacheFor(
	options: FetchCachedAdTechProvidersOptions
): AdTechProviderCache {
	if (options.cache) {
		return options.cache;
	}
	if (isAbsoluteUrl(options.reference.url)) {
		return sharedCache;
	}
	let cache = relativeCaches.get(options.fetch);
	if (!cache) {
		cache = new Map();
		relativeCaches.set(options.fetch, cache);
	}
	return cache;
};

const inflightFor = function inflightFor(cache: AdTechProviderCache) {
	let inflight = inflightByCache.get(cache);
	if (!inflight) {
		inflight = new Map();
		inflightByCache.set(cache, inflight);
	}
	return inflight;
};

/**
 * Drops cached provider lists; the next call fetches again. Without an
 * argument, drops every list this module holds.
 */
export const clearAdTechProviderCache = function clearAdTechProviderCache(
	cache?: AdTechProviderCache
): void {
	if (cache) {
		cache.clear();
		inflightByCache.delete(cache);
		return;
	}
	sharedCache.clear();
	inflightByCache.delete(sharedCache);
	relativeCaches = new WeakMap();
};

/**
 * Loads the providers a manifest lists, through an in-process cache that
 * coalesces concurrent requests. A relative endpoint is cached per fetch
 * implementation, since each may resolve it to a different list.
 *
 * After a failed fetch the endpoint is not asked again for a minute; the
 * last good list, or nothing, is served meanwhile.
 *
 * @param options - The manifest reference and fetch implementation.
 * @returns The listed providers sorted by ID, the last good list when the
 *   endpoint fails and that list is under 30 days old, or `undefined`.
 */
export const fetchCachedAdTechProviders = function fetchCachedAdTechProviders(
	options: FetchCachedAdTechProvidersOptions
): Promise<AdTechProvider[] | undefined> {
	const cache = cacheFor(options);
	const inflight = inflightFor(cache);
	const now = options.now ?? Date.now();
	const ids = normalizeAdTechProviderIds(options.reference.providers);
	const key = `${options.reference.url}|${ids.join(',')}`;
	const cached = cache.get(key);
	if (cached && cached.expiresAt > now) {
		return Promise.resolve(cached.providers);
	}
	const stale =
		cached && cached.staleUntil > now ? cached.providers : undefined;
	if (cached && !stale) {
		cache.delete(key);
	}
	const pending = inflight.get(key);
	if (pending) {
		return pending;
	}
	// Serves the stale list, or nothing, until the next attempt; never past
	// the list's own stale bound.
	const backOff = () => {
		const staleUntil = stale && cached ? cached.staleUntil : 0;
		cache.set(key, {
			expiresAt: stale
				? Math.min(now + FAILURE_BACKOFF_MS, staleUntil)
				: now + FAILURE_BACKOFF_MS,
			providers: stale,
			staleUntil,
		});
		return stale;
	};
	const run = (async () => {
		try {
			const response = await options.fetch(
				adTechProviderListUrl(options.reference.url, ids),
				{
					headers: options.headers,
					method: 'GET',
					signal: adTechProviderFetchSignal(),
				}
			);
			const providers = response.ok
				? parseAdTechProviderList(await response.json(), ids)
				: null;
			if (!providers) {
				return backOff();
			}
			cache.set(key, {
				expiresAt: now + TTL_MS,
				providers,
				staleUntil: now + STALE_TTL_MS,
			});
			return providers;
		} catch {
			return backOff();
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, run);
	return run;
};

/**
 * The Google Additional Consent providers to send with an init output.
 *
 * An output that resolved to an IAB policy always says which providers apply:
 * `[]` when the manifest lists none, so a client that held providers from an
 * earlier configuration withdraws them. Only a list that could not be loaded
 * is left out, which the client reads as "keep what you hold".
 *
 * @param manifest - The manifest the output resolved from.
 * @param output - The resolved init output.
 * @param load - Loads the providers a manifest reference lists.
 * @returns The providers to send, or `undefined` to leave the field out.
 */
export const loadManifestAdTechProviders = function loadManifestAdTechProviders(
	manifest: ConsentManifest,
	output: InitOutput,
	load: (
		reference: ConsentManifestAdditionalConsent
	) => Promise<AdTechProvider[] | undefined>
): Promise<AdTechProvider[] | undefined> {
	if (
		manifest.iab?.enabled !== true ||
		output.policyResolution?.status !== 'matched' ||
		output.policyResolution.policy.model !== 'iab'
	) {
		return Promise.resolve(undefined);
	}
	const reference = manifest.iab.additionalConsent;
	return reference ? load(reference) : Promise.resolve([]);
};
