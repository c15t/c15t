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
	providers: AdTechProvider[];
	/** Until when the list is served without asking the endpoint again. */
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
const defaultCache: AdTechProviderCache = new Map();
const inflight = new Map<string, Promise<AdTechProvider[] | undefined>>();

/** Drops every cached provider list; the next call fetches again. */
export const clearAdTechProviderCache = function clearAdTechProviderCache(
	cache: AdTechProviderCache = defaultCache
): void {
	cache.clear();
	inflight.clear();
};

/**
 * Loads the providers a manifest lists, through an in-process cache that
 * coalesces concurrent requests.
 *
 * @param options - The manifest reference and fetch implementation.
 * @returns The listed providers sorted by ID, the last good list when the
 *   endpoint fails and that list is under 30 days old, or `undefined`.
 */
export const fetchCachedAdTechProviders = function fetchCachedAdTechProviders(
	options: FetchCachedAdTechProvidersOptions
): Promise<AdTechProvider[] | undefined> {
	const cache = options.cache ?? defaultCache;
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
				return stale;
			}
			cache.set(key, {
				expiresAt: now + TTL_MS,
				providers,
				staleUntil: now + STALE_TTL_MS,
			});
			return providers;
		} catch {
			return stale;
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, run);
	return run;
};

/**
 * The manifest's provider reference when an init output resolved to an IAB
 * policy that should disclose providers, otherwise `undefined`.
 *
 * @param manifest - The manifest the output resolved from.
 * @param output - The resolved init output.
 * @returns The reference to load providers from.
 */
export const adTechProviderReference = function adTechProviderReference(
	manifest: ConsentManifest,
	output: InitOutput
): ConsentManifestAdditionalConsent | undefined {
	return manifest.iab?.enabled === true &&
		output.policyResolution?.status === 'matched' &&
		output.policyResolution.policy.model === 'iab'
		? manifest.iab.additionalConsent
		: undefined;
};
