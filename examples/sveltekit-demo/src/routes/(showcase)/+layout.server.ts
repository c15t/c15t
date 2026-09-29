import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

/**
 * Resolves the consent decision on the server so the banner is in the first
 * HTML rather than appearing a frame after hydration.
 *
 * `initRoute` points at this app's own consent endpoint, which resolves the
 * policy from the cached tenant manifest — no third-party round trip on the
 * SSR path. The geo pin matches the provider's `overrides` in
 * `+layout.svelte`, so the server and the client resolve the same policy.
 */
export const load: LayoutServerLoad = async (event) => ({
	prefetch: await loadConsent(event, {
		country: 'CA',
		initRoute: '/api/showcase',
		region: 'QC',
	}),
});
