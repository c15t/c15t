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
 * Fetches names and privacy policy links for the configured providers, from
 * cache where possible.
 *
 * Returns null rather than throwing when the upstream is unavailable: the
 * AC string only supplements the TC string, and a thrown error would fail
 * `/init` and leave the visitor with no consent UI at all.
 *
 * @param options - Providers and endpoint from the manifest, plus loading options.
 * @returns The listed providers sorted by ID, `[]` when none of the
 *   configured IDs is listed, or null when the list could not be loaded.
 */
export const resolveAdTechProviders = async function resolveAdTechProviders(
	options: AdTechProviderOptions
): Promise<AdTechProvider[] | null> {
	const ids = normalizeAdTechProviderIds(options.providers);
	if (ids.length === 0) {
		return [];
	}
	const key = adTechProviderCacheKey(options.url, ids);

	const cached = await options.cache?.get<AdTechProvider[]>(key);
	if (cached) {
		return cached;
	}
	const existing = inflight.get(key);
	if (existing) {
		return existing;
	}

	const request = (async () => {
		try {
			const doFetch = options.fetch ?? globalThis.fetch;
			const response = await doFetch(adTechProviderListUrl(options.url, ids));
			if (!response.ok) {
				return null;
			}
			const providers = parseAdTechProviderList(await response.json(), ids);
			if (providers) {
				await options.cache?.set(
					key,
					providers,
					options.ttlMs ?? DEFAULT_TTL_MS
				);
			}
			return providers;
		} catch {
			return null;
		} finally {
			inflight.delete(key);
		}
	})();
	inflight.set(key, request);
	return request;
};
