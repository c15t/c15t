/**
 * Global Vendor List resolution for IAB deployments.
 *
 * The GVL is large, changes rarely, and is identical for every visitor in a
 * given language — so fetching it per request would put a third-party round
 * trip on the critical rendering path for no benefit. It is cached, and
 * concurrent misses share one fetch rather than stampeding the upstream.
 *
 * Only reached when IAB is enabled and active for the request. Everyone else
 * pays nothing: `gvl` is optional in the contract precisely because most
 * deployments never need it.
 */

import { globalVendorListSchema } from '@c15t/schema';
import type { GlobalVendorList } from '@c15t/schema';
import * as v from 'valibot';

import type { CacheAdapter } from '../cache/types';

export type { CacheAdapter };

export interface GvlOptions {
	readonly endpoint?: string;
	readonly vendorIds?: readonly number[];
	readonly cache?: CacheAdapter;
	/** How long a fetched list stays fresh. Defaults to one day. */
	readonly ttlMs?: number;
	/** Injected in tests; defaults to global fetch. */
	readonly fetch?: typeof globalThis.fetch;
}

const DEFAULT_ENDPOINT = 'https://gvl.inth.app';
const DEFAULT_TTL_MS = 86_400_000;

/**
 * Most vendor ids worth putting into a request line.
 *
 * The upstream filters server-side, which is what keeps a scoped publisher off
 * the ~850 KB full document, but the filter travels as a query string, and past
 * a few hundred ids a CDN's request-line limit starts failing the whole
 * consent surface for a publisher who scoped wide. `packages/iab` caps the same
 * way on the client; above the cap the list is fetched whole and narrowed here,
 * so the cap costs bytes rather than disclosure correctness.
 */
const MAX_GVL_QUERY_VENDOR_IDS = 500;

/**
 * The request URL for one (endpoint, allowlist) pair.
 *
 * The document is served at the endpoint itself: the upstream answers
 * `/<language>.json` with a 404, so a per-language path is not a fallback, it
 * is a broken URL. Only the vendor filter is appended. Joined by hand rather
 * than through `new URL` because a deployment may configure a relative
 * endpoint, which `URL` rejects outright.
 */
const gvlRequestUrl = function gvlRequestUrl(
	endpoint: string,
	vendorIds: readonly number[] | undefined
): string {
	if (!vendorIds || vendorIds.length === 0) {
		return endpoint;
	}
	const query = new URLSearchParams({
		vendorIds: [...vendorIds].sort((a, b) => a - b).join(','),
	});
	return `${endpoint}${endpoint.includes('?') ? '&' : '?'}${query}`;
};

/**
 * Restrict a document to a publisher's vendor allowlist.
 *
 * The filter has to run somewhere. Fetching the full list and serving it
 * because the allowlist was too wide to travel would disclose every GVL vendor
 * to a visitor who was only ever shown a publisher's own partners.
 */
const narrowToVendorIds = function narrowToVendorIds(
	gvl: GlobalVendorList,
	vendorIds: readonly number[] | undefined
): GlobalVendorList {
	if (!vendorIds || vendorIds.length === 0) {
		return gvl;
	}
	const allowed = new Set(vendorIds.map(String));
	const vendors: GlobalVendorList['vendors'] = {};
	for (const [id, vendor] of Object.entries(gvl.vendors)) {
		if (allowed.has(id)) {
			vendors[id] = vendor;
		}
	}
	return { ...gvl, vendors };
};

/**
 * Cache key.
 *
 * Vendor ids are sorted before hashing into the key: the same set requested in
 * a different order is the same list, and treating it as a different one would
 * multiply cache entries and miss rates for no reason.
 */
export const gvlCacheKey = function gvlCacheKey(
	endpoint: string,
	language: string,
	vendorIds: readonly number[] | undefined
): string {
	const vendors = vendorIds
		? [...vendorIds].sort((a, b) => a - b).join(',')
		: '';
	return `gvl:${endpoint}|${language}|${vendors}`;
};

/**
 * In-flight requests, keyed the same way as the cache.
 *
 * Module-scoped on purpose. A cold cache under load means every concurrent
 * request misses at once; without this they would each fetch the same large
 * document from the same upstream simultaneously.
 */
const inflight = new Map<string, Promise<GlobalVendorList | null>>();

/**
 * Fetches the vendor list for a language, from cache where possible.
 *
 * Returns null rather than throwing when the upstream is unavailable. A
 * missing GVL degrades the IAB experience; a thrown error would fail `/init`
 * entirely and leave the visitor with no consent UI at all — strictly worse,
 * and on the critical rendering path.
 */
export const resolveGvl = async function resolveGvl(
	language: string,
	options: GvlOptions
): Promise<GlobalVendorList | null> {
	// The upstream publishes one English document today, so the language does
	// not reach the URL. It stays in the cache key: it costs a duplicate entry
	// per served language, and it is already correct the day a translated list
	// is published at a per-language endpoint.
	const primary = language.split('-')[0] || 'en';
	const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
	const key = gvlCacheKey(endpoint, primary, options.vendorIds);

	const cached = await options.cache?.get<GlobalVendorList>(key);
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
			const { vendorIds } = options;
			const filterTravels =
				vendorIds !== undefined &&
				vendorIds.length > 0 &&
				vendorIds.length <= MAX_GVL_QUERY_VENDOR_IDS;
			const response = await doFetch(
				gvlRequestUrl(endpoint, filterTravels ? vendorIds : undefined)
			);
			if (!response.ok) {
				return null;
			}
			// Validated rather than trusted: an upstream returning something
			// unexpected must not flow into a contract-typed response field,
			// and caching a malformed document would persist the problem.
			const parsed = v.safeParse(globalVendorListSchema, await response.json());
			if (!parsed.success) {
				return null;
			}
			// Narrow before caching, so a wide allowlist never leaves a full
			// document in the cache under a key that promises a scoped one.
			const resolved = narrowToVendorIds(parsed.output, vendorIds);
			await options.cache?.set(key, resolved, options.ttlMs ?? DEFAULT_TTL_MS);
			return resolved;
		} catch {
			return null;
		} finally {
			inflight.delete(key);
		}
	})();

	inflight.set(key, request);
	return request;
};
