/**
 * `GET /api/c15t/manifest` — the shipped `@c15t/svelte/kit` consent route,
 * serving the fixture's manifest with its cache headers. `GET` picks
 * `manifest` from the path's last segment.
 */
import { createConsentRoute } from '@c15t/svelte/kit';

export const { GET } = createConsentRoute({
	manifestURL: '/api/bench-consent/manifest',
});
