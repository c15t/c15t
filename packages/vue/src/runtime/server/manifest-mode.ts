/**
 * Nuxt adapter over `@c15t/core/transports/manifest-cache`.
 *
 * The caching, revalidation, and local init resolution live in core so the
 * framework server adapters share one implementation. This module only maps
 * the Nuxt runtime config onto that API.
 */
import {
	fetchCachedManifest as fetchCachedManifestFromSource,
	resolveManifestSourceURL as resolveManifestSourceURLFromOptions,
} from '@c15t/core/transports/manifest-cache';
import type {
	CachedManifestResponse,
	ManifestFetch,
} from '@c15t/core/transports/manifest-cache';

import type { ConsentConfig } from '../config';

export {
	C15T_TIMEOUT_HEADER,
	resolveNuxtInitRoute,
	resolveNuxtManifestRoute,
} from '../manifest';
export { clearManifestCache as clearManifestRouteCache } from '@c15t/core/transports/manifest-cache';

export type {
	CachedManifestResponse,
	ManifestFetch,
} from '@c15t/core/transports/manifest-cache';
export {
	createManifestRequestURL,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	getResolverInputsFromHeaders,
	MANIFEST_DEDUPE_TTL_SECONDS,
	ManifestUnavailableError,
	resolveManifestInit,
} from '@c15t/core/transports/manifest-cache';

export type ManifestModeRuntimeConfig = Pick<
	ConsentConfig,
	'backendURL' | 'manifestURL' | 'initRoute' | 'manifestRoute'
>;

export const resolveManifestSourceURL = function resolveManifestSourceURL(
	config: ManifestModeRuntimeConfig
): string {
	return resolveManifestSourceURLFromOptions({
		backendURL: config.backendURL,
		manifestURL: config.manifestURL,
	});
};

export const fetchCachedManifest = function fetchCachedManifest(input: {
	config: ManifestModeRuntimeConfig;
	fetch?: ManifestFetch;
	query?: string;
	now?: number;
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;
	/** Longest to wait for the upstream when nothing servable is cached. */
	timeoutMs?: number;
}): Promise<CachedManifestResponse> {
	return fetchCachedManifestFromSource({
		fetch: input.fetch,
		now: input.now,
		onBackgroundRevalidate: input.onBackgroundRevalidate,
		query: input.query,
		sourceURL: resolveManifestSourceURL(input.config),
		timeoutMs: input.timeoutMs,
	});
};
