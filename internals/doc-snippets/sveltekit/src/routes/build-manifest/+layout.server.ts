// #region docs:build-manifest-layout-server title="src/routes/+layout.server.ts"
import { building } from '$app/env';
import { loadConsent } from '@c15t/svelte/kit';

import { consentOptions } from '#lib/server/c15t.js';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => ({
	prefetch: await loadConsent(event, { ...consentOptions, shared: building }),
});
// #endregion docs:build-manifest-layout-server
