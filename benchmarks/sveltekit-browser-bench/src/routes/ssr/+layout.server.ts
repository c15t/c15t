import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

/**
 * Direct-init SSR: `loadConsent` calls the fixture backend's `/init` on the
 * request path, so the consent round-trip lands in the page's TTFB. This is
 * the arm manifest mode is measured against.
 *
 * The backend URL is absolute because the shared resolver assumes `https`
 * for a relative URL with no `x-forwarded-proto`, and the bench server
 * speaks plain HTTP. Deriving it from `event.url` keeps the request
 * same-origin, so `event.fetch` still handles it in-process.
 */
export const load: LayoutServerLoad = async (event) => ({
	consentPrefetch: await loadConsent(event, {
		backendURL: new URL('/api/bench-consent', event.url).toString(),
	}),
});
