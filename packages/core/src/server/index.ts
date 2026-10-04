/**
 * `@c15t/core/server` — server-only helpers shared by host framework layers.
 *
 * Nothing here touches the DOM or the kernel. The consent route handler
 * (`createConsentRouteHandler`) answers `/manifest` and `/init` for every
 * host integration (Next.js, Nuxt, SvelteKit, Astro, TanStack Start), and
 * `resolveRequestConsent` / `readRequestConsent` resolve the consent state a
 * server render hands the client, and `fetchCachedManifest` is the one
 * process cache for the backend's manifest. Resolving `/init` from a
 * manifest, which imports every translation, is at
 * `@c15t/core/transports/manifest-cache`.
 *
 * Each export is its own module, so a bundle that imports only
 * `resolveRequestBackendURL` does not pull in the init resolver.
 */
export type {
	ConsentProxyForwarding,
	ConsentProxyOptions,
} from './consent-proxy';
export type {
	ConsentInitReport,
	ConsentRouteFetchGvl,
	ConsentRouteHandler,
	ConsentRouteHandlerOptions,
	ConsentRouteName,
	ConsentRouteRequestContext,
} from './consent-route';
export {
	CONSENT_ROUTE_TIMEOUT_HEADER,
	createConsentRouteHandler,
	readWaitUntil,
} from './consent-route';
export type {
	ConsentRequestFacts,
	RequestConsentMode,
	RequestConsentRead,
	RequestConsentState,
	ResolveRequestConsentOptions,
} from './request-consent';
export {
	DEFAULT_CONSENT_ROUTE_PREFIX,
	readRequestConsent,
	resolveRenderBudgetMs,
	resolveRequestConsent,
} from './request-consent';
export type { FetchCachedGvlOptions } from './gvl-cache';
export { clearGvlCache, fetchCachedGvl } from './gvl-cache';
export type {
	CachedManifestResponse,
	FetchCachedManifestOptions,
	ManifestCache,
	ManifestCacheOptions,
	ManifestFetch,
	ManifestSourceOptions,
	ManifestUnavailableReason,
} from '../libs/manifest-cache-runtime';
export {
	clearManifestCache,
	createManifestCache,
	createManifestRequestURL,
	fetchCachedManifest,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_PASSTHROUGH_HEADERS,
	ManifestUnavailableError,
	resolveManifestSourceURL,
} from '../libs/manifest-cache-runtime';
export {
	createStaticManifestModule,
	loadStaticManifest,
} from './static-manifest';
export type { StaticManifestModuleOptions } from './static-manifest';
export type {
	RequestHeaderSource,
	ResolveRequestOriginOptions,
} from './request-origin';
export {
	resolveRequestBackendURL,
	resolveRequestOrigin,
} from './request-origin';
