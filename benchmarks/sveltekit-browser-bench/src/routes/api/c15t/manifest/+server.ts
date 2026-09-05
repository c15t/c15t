/**
 * `GET /api/c15t/manifest` — the shipped `@c15t/svelte/kit` manifest proxy,
 * forwarding the fixture's cache headers verbatim.
 */
import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';

import type { RequestHandler } from './$types';

const handlers = createSvelteKitConsentRouteHandlers({
	manifestURL: '/api/bench-consent/manifest',
});

export const GET: RequestHandler = handlers.manifest;
