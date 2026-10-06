import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

/**
 * Manifest SSR: `loadConsent` resolves through the same-origin init route
 * installed with `createSvelteKitConsentRouteHandlers`, which resolves the
 * cached manifest in-process. The backend never sits on the request path.
 */
export const load: LayoutServerLoad = async (event) => ({
	consentPrefetch: await loadConsent(event, { initRoute: '/api/c15t/init' }),
});
