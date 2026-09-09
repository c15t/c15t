/**
 * In-process cache for a backend `/manifest` response.
 *
 * Framework route handlers proxy the backend manifest to a same-origin URL
 * so browsers and server helpers read it without a cross-origin round trip.
 * The proxy has to avoid hitting the backend on every request, and not every
 * runtime has a data cache to lean on (the Next.js Pages Router and plain
 * Node servers have none), so the caching lives here: honour the backend's
 * `s-maxage`, revalidate with `If-None-Match` once it expires, and never
 * reuse a response the backend marked `no-store`, `no-cache`, or `private`.
 *
 * @packageDocumentation
 */

import type { ConsentManifest } from '@c15t/schema/types';

import {
	clearManifestCache as clearCache,
	createManifestCache,
	fetchCachedManifest as fetchManifest,
} from './manifest-cache-runtime';

export {
	getManifestSMaxAge,
	MANIFEST_DEDUPE_TTL_SECONDS,
	parseCacheDirectiveSeconds,
	resolveManifestCacheTtlSeconds,
} from './manifest-cache-runtime';

export type ManifestFetch = (
	input: string | URL | Request,
	init?: RequestInit
) => Promise<Response>;

export interface CachedManifest {
	manifest: ConsentManifest;
	/** Lower-cased response headers from the backend. */
	headers: Record<string, string>;
	/** `s-maxage` the backend asked for, `0` when it sent none. */
	sMaxAge: number;
	/** Epoch milliseconds after which the entry revalidates. */
	expiresAt: number;
}

export interface FetchCachedManifestOptions {
	/** Absolute manifest URL, including any query such as `?language=de`. */
	url: string;
	fetch?: ManifestFetch;
	/** Extra request headers, merged over the defaults. */
	headers?: Record<string, string>;
	/**
	 * Extra `RequestInit` fields for the backend fetch. Frameworks use this to
	 * pass their own cache hints, such as Next.js `next.revalidate`.
	 */
	init?: Omit<RequestInit, 'headers' | 'method'>;
	/** Clock override for tests. */
	now?: number;
}

const cache = createManifestCache();

/** Fetches a manifest using the shared HTTP cache and framework fetch options. */
export const fetchCachedManifest = (
	options: FetchCachedManifestOptions
): Promise<CachedManifest> =>
	fetchManifest({
		cache,
		fetch: options.fetch,
		headers: options.headers,
		init: options.init,
		now: options.now,
		sourceURL: options.url,
	});

/** Clears cached manifests and invalidates pending fills. */
export const clearManifestCache = (): void => clearCache(cache);
