/**
 * `@c15t/astro/api` — route handlers for the injected consent endpoints.
 *
 * The manifest cache itself lives in `@c15t/core` (re-exported here from
 * `@c15t/core/server`): one entry point and one process cache shared with the
 * Next.js, Nuxt, SvelteKit and TanStack Start layers, so no two hosts can
 * disagree about cache lifetimes, revalidation or cache keys.
 */

export {
	createConsentRouteHandlers,
	resolveManifestSourceURL,
	waitUntilFromLocals,
} from './handlers';
export type { ConsentRouteHandlerOptions, RequestLifetime } from './handlers';
export {
	loadConsentManifest,
	resolveManifestInit,
	resolveManifestSourceFrom,
	resolveSessionReportURL,
} from './manifest-init';
export type {
	FetchGvl,
	RequestSource,
	ResolvedInitOutput,
	SessionReportTarget,
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
} from '@c15t/core/server';
