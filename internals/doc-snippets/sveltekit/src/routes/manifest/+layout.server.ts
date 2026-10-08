// #region docs:manifest-layout-server title="src/routes/+layout.server.ts"
import { building } from '$app/env';
import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => ({
	// Resolve through this app's own route, which caches the policy manifest,
	// instead of calling the backend on every page load.
	prefetch: await loadConsent(event, {
		initRoute: '/api/c15t',
		shared: building,
	}),
});
// #endregion docs:manifest-layout-server
