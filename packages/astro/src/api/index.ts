/**
 * `@c15t/astro/api` — route handlers for the injected consent endpoints.
 *
 * The manifest cache itself lives in `@c15t/core/server`, shared with the
 * Next.js, Nuxt and SvelteKit layers so no two hosts can disagree about
 * cache lifetimes or revalidation.
 */

export {
	createConsentRouteHandlers,
	resolveManifestSourceURL,
} from './handlers';
export type { ConsentRouteHandlerOptions } from './handlers';
export {
	loadConsentManifest,
	resolveManifestInit,
	resolveManifestSourceFrom,
} from './manifest-init';
export type {
	FetchGvl,
	RequestSource,
	ResolvedInitOutput,
} from './manifest-init';
export {
	clearManifestCache,
	createManifestRequestURL,
	fetchCachedManifest,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_PASSTHROUGH_HEADERS,
} from '@c15t/core/server';
export type {
	CachedManifestResponse,
	FetchCachedManifestOptions,
	ManifestFetch,
	ManifestSourceConfig,
} from '@c15t/core/server';
