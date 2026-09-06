import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

/**
 * Same wiring as `ssr-manifest`; the runner seeds a consent cookie before
 * navigating, so the server resolves "already consented" and renders no
 * banner at all.
 */
export const load: LayoutServerLoad = async (event) => ({
	consentPrefetch: await loadConsent(event, { initRoute: '/api/c15t/init' }),
});
