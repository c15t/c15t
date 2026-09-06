/**
 * `GET /api/c15t/init` — the shipped `@c15t/svelte/kit` init handler, pointed
 * at the local manifest fixture. Nothing here re-implements resolution; the
 * bench measures the package.
 */
import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';

import type { RequestHandler } from './$types';

const handlers = createSvelteKitConsentRouteHandlers({
	manifestURL: '/api/bench-consent/manifest',
});

export const GET: RequestHandler = handlers.init;
