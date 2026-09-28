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
	ManifestUnavailableError,
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
	 * Receives manifest work that outlives this request (a background
	 * revalidation, or a fill `timeoutMs` stopped waiting for), so the host
	 * can keep it alive past the response on runtimes that stop detached work
	 * once a response is sent (a platform `waitUntil`, for example). The
	 * promise never rejects. Not called when the manifest is fresh or the
	 * request waits for the upstream to finish.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
	/** Longest to wait for the upstream when nothing servable is cached. */
	timeoutMs?: number;
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
		timeoutMs: input.timeoutMs,
	});

/** Clears cached manifests and invalidates pending fills. */
export const clearManifestCache = (): void => clearCache(cache);
