// #region docs:layout-server
import { building } from '$app/env';
import { PUBLIC_C15T_BACKEND_URL } from '$app/env/public';
import { loadConsent } from '@c15t/svelte/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => ({
	// A prerendered page is built once and sent to every visitor, so it must
	// not carry one visitor's consent. The browser resolves it there instead.
	prefetch: building
		? undefined
		: await loadConsent(event, { backendURL: PUBLIC_C15T_BACKEND_URL }),
});
// #endregion docs:layout-server
