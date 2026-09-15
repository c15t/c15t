/** Manifest cache for server route adapters. */
import {
	clearManifestCache as clearCache,
	createManifestCache,
	fetchCachedManifest as fetchManifest,
	resolveManifestSourceURL,
} from '../libs/manifest-cache-runtime';
import type {
	CachedManifestResponse,
	ManifestFetch,
} from '../libs/manifest-cache-runtime';

export type {
	CachedManifestResponse,
	ManifestFetch,
} from '../libs/manifest-cache-runtime';
export {
	createManifestRequestURL,
	getManifestAge,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_PASSTHROUGH_HEADERS,
	resolveManifestSourceURL,
} from '../libs/manifest-cache-runtime';

/** Backend or explicit manifest URL. */
export interface ManifestSourceConfig {
	backendURL?: string;
	manifestURL?: string;
}

export interface FetchCachedManifestOptions {
	config: ManifestSourceConfig;
	fetch?: ManifestFetch;
	/** Already-encoded query string, e.g. `language=de`. */
	query?: string;
	/** Injectable clock, for tests. */
	now?: number;
	/**
	 * Receives the promise of a background manifest revalidation started by
	 * this request, so the host can keep it alive past the response on
	 * runtimes that stop detached work once a response is sent (a platform
	 * `waitUntil`, for example). The promise never rejects. Not called when
	 * the manifest is fresh or the request itself waits on the upstream.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
}

const cache = createManifestCache({ maxEntries: 64 });

/** Fetches a manifest using the shared HTTP cache. */
// oxlint-disable-next-line require-await -- URL validation errors must reject the returned promise.
export const fetchCachedManifest = async (
	input: FetchCachedManifestOptions
): Promise<CachedManifestResponse> =>
	fetchManifest({
		cache,
		fetch: input.fetch,
		now: input.now,
		onBackgroundRevalidate: input.onBackgroundRevalidate,
		query: input.query,
		sourceURL: resolveManifestSourceURL(input.config),
	});

/** Clears cached manifests and invalidates pending fills. */
export const clearManifestCache = (): void => clearCache(cache);
