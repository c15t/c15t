/**
 * Nuxt adapter over `@c15t/core/transports/manifest-cache`.
 *
 * The caching, revalidation, and local init resolution live in core so the
 * framework server adapters share one implementation. This module only maps
 * the Nuxt runtime config onto that API.
 */
import {
	clearManifestCache,
	fetchCachedManifest as fetchCachedManifestFromSource,
	resolveManifestSourceURL as resolveManifestSourceURLFromOptions,
} from '@c15t/core/transports/manifest-cache';
import type {
	CachedManifestResponse,
	ManifestFetch,
} from '@c15t/core/transports/manifest-cache';

import type { ConsentConfig } from '../config';
import { DEFAULT_MANIFEST_ROUTE, DEFAULT_NUXT_INIT_ROUTE } from '../manifest';

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

export const resolveNuxtInitRoute = function resolveNuxtInitRoute(
	config: Pick<ConsentConfig, 'initRoute'>
): string {
	return config.initRoute ?? DEFAULT_NUXT_INIT_ROUTE;
};

export const resolveNuxtManifestRoute = function resolveNuxtManifestRoute(
	config: Pick<ConsentConfig, 'manifestRoute'>
): string {
	return config.manifestRoute ?? DEFAULT_MANIFEST_ROUTE;
};

export const fetchCachedManifest = function fetchCachedManifest(input: {
	config: ManifestModeRuntimeConfig;
	fetch?: ManifestFetch;
	query?: string;
	now?: number;
}): Promise<CachedManifestResponse> {
	return fetchCachedManifestFromSource({
		fetch: input.fetch,
		now: input.now,
		query: input.query,
		sourceURL: resolveManifestSourceURL(input.config),
	});
};

export const clearManifestRouteCache =
	function clearManifestRouteCache(): void {
		clearManifestCache();
	};
