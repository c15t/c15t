/**
 * `@c15t/astro/api` — route handlers for the injected consent endpoints.
 */

export {
	createConsentRouteHandlers,
	resolveManifestSourceURL,
} from './handlers';
export type { ConsentRouteHandlerOptions } from './handlers';
export {
	clearManifestCache,
	fetchCachedManifest,
	getManifestSMaxAge,
	MANIFEST_DEDUPE_TTL_SECONDS,
} from './manifest-cache';
export type { CachedManifestResponse, ManifestFetch } from './manifest-cache';
