// #region docs:layout-server
import { building } from '$app/env';
import { loadConsent } from '@c15t/svelte/kit';

import { consentOptions } from '#lib/server/c15t.js';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => ({
	// A prerendered page is built once and sent to every visitor, so it must
	// not carry one visitor's consent. The browser resolves it there instead.
	prefetch: await loadConsent(event, { ...consentOptions, shared: building }),
});
// #endregion docs:layout-server
