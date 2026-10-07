/**
 * Same-origin consent endpoint for the showcase.
 *
 * `GET /api/showcase` resolves `/init` locally from the tenant manifest, and
 * `GET /api/showcase/manifest` proxies the manifest with the backend's own
 * cache headers. With `proxy: true`, consent writes and identity linking are
 * forwarded to the self-hosted backend mounted at `/api/self-host`, so the
 * browser only ever talks to this origin.
 */
import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';

export const { GET, POST, PATCH, PUT, DELETE, OPTIONS } =
	createSvelteKitConsentRouteHandlers({
		backendURL: '/api/self-host',
		proxy: true,
	});
