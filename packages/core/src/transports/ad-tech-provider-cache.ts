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
	expiresAt: number;
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
 *   endpoint fails, or `undefined` when there is none.
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
	const pending = inflight.get(key);
	if (pending) {
		return pending;
	}
	const run = (async () => {
		try {
			const response = await options.fetch(
				adTechProviderListUrl(options.reference.url, ids),
				{ headers: options.headers, method: 'GET' }
			);
			const providers = response.ok
				? parseAdTechProviderList(await response.json(), ids)
				: null;
			if (!providers) {
				return cached?.providers;
			}
			cache.set(key, { expiresAt: now + TTL_MS, providers });
			return providers;
		} catch {
			return cached?.providers;
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
