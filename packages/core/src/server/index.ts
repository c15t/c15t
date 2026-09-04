/**
 * `@c15t/core/server` — server-only helpers shared by host framework layers.
 *
 * Nothing here touches the DOM or the kernel; it is the piece every host
 * integration (Next.js, Nuxt, SvelteKit, TanStack Start) would otherwise
 * hand-roll identically behind its own `/manifest` route.
 */
export type {
	CachedManifestResponse,
	FetchCachedManifestOptions,
	ManifestFetch,
	ManifestSourceConfig,
} from './manifest-cache';
export {
	clearManifestCache,
	createManifestRequestURL,
	fetchCachedManifest,
	getManifestSMaxAge,
	getManifestStaleWhileRevalidate,
	MANIFEST_DEDUPE_TTL_SECONDS,
	MANIFEST_PASSTHROUGH_HEADERS,
	resolveManifestSourceURL,
} from './manifest-cache';
