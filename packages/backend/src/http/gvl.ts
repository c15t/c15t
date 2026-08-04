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

import { type GlobalVendorList, globalVendorListSchema } from '@c15t/schema';
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
 * Cache key.
 *
 * Vendor ids are sorted before hashing into the key: the same set requested in
 * a different order is the same list, and treating it as a different one would
 * multiply cache entries and miss rates for no reason.
 */
export function gvlCacheKey(
	endpoint: string,
	language: string,
	vendorIds: readonly number[] | undefined
): string {
	const vendors = vendorIds
		? [...vendorIds].sort((a, b) => a - b).join(',')
		: '';
	return `gvl:${endpoint}|${language}|${vendors}`;
}

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
export async function resolveGvl(
	language: string,
	options: GvlOptions
): Promise<GlobalVendorList | null> {
	// The list is published per primary subtag, so 'de-DE' and 'de' are the
	// same document.
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
			const response = await doFetch(`${endpoint}/${primary}.json`);
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
			await options.cache?.set(
				key,
				parsed.output,
				options.ttlMs ?? DEFAULT_TTL_MS
			);
			return parsed.output;
		} catch {
			return null;
		} finally {
			inflight.delete(key);
		}
	})();

	inflight.set(key, request);
	return request;
}
