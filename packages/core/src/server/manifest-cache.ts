/** Manifest cache for server route adapters. */
import type { ConsentManifest } from '@c15t/schema/types';

import {
	clearManifestCache as clearCache,
	createManifestCache,
	fetchCachedManifest as fetchManifest,
	resolveManifestSourceURL,
} from '../libs/manifest-cache-runtime';
import type { ManifestFetch } from '../libs/manifest-cache-runtime';

export type { ManifestFetch } from '../libs/manifest-cache-runtime';
export {
	createManifestRequestURL,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_PASSTHROUGH_HEADERS,
	resolveManifestSourceURL,
} from '../libs/manifest-cache-runtime';

/** A manifest and upstream metadata used by server routes. */
export interface CachedManifestResponse {
	manifest: ConsentManifest;
	headers: Record<string, string>;
	sMaxAge: number;
	expiresAt: number;
}

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
		query: input.query,
		sourceURL: resolveManifestSourceURL(input.config),
	});

/** Clears cached manifests and invalidates pending fills. */
export const clearManifestCache = (): void => clearCache(cache);
