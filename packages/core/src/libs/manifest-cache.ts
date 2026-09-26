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

import type { CachedManifestResponse } from './manifest-cache-runtime';
import {
	clearManifestCache as clearCache,
	createManifestCache,
	fetchCachedManifest as fetchManifest,
} from './manifest-cache-runtime';

export {
	DEFAULT_RESOLVE_TIMEOUT_MS,
	getManifestAge,
	getManifestSMaxAge,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_FAILURE_RETRY_MAX_MS,
	MANIFEST_FAILURE_RETRY_MIN_MS,
	MANIFEST_FETCH_TIMEOUT_MS,
	ManifestUnavailableError,
	parseCacheDirectiveSeconds,
	resolveManifestCacheTtlSeconds,
	withResolutionBudget,
} from './manifest-cache-runtime';
export type { ManifestUnavailableReason } from './manifest-cache-runtime';

export type ManifestFetch = (
	input: string | URL | Request,
	init?: RequestInit
) => Promise<Response>;

export type { CachedManifestResponse as CachedManifest } from './manifest-cache-runtime';

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
	/**
	 * Longest the call waits for the upstream when nothing servable is cached.
	 * See the runtime option of the same name.
	 */
	timeoutMs?: number;
	/**
	 * Receives the promise of upstream work that outlives this read (a
	 * background revalidation, or a fill the read stopped waiting for), for
	 * hosts that must register detached work with the platform (Next.js
	 * `after`, Vercel `waitUntil`). See the runtime option of the same name.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
}

const cache = createManifestCache();

/** Fetches a manifest using the shared HTTP cache and framework fetch options. */
export const fetchCachedManifest = (
	options: FetchCachedManifestOptions
): Promise<CachedManifestResponse> =>
	fetchManifest({
		cache,
		fetch: options.fetch,
		headers: options.headers,
		init: options.init,
		now: options.now,
		onBackgroundRevalidate: options.onBackgroundRevalidate,
		sourceURL: options.url,
		timeoutMs: options.timeoutMs,
	});

/** Clears cached manifests and invalidates pending fills. */
export const clearManifestCache = (): void => clearCache(cache);
