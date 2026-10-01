// #region docs:layout-server title="src/routes/+layout.server.ts"
import { building } from '$app/env';
// #endhide docs
import { loadConsent } from '@c15t/svelte/kit';

// #hide docs
import { testBackend } from '#lib/test-backend.js';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => ({
	// A prerendered page is built once and sent to every visitor, so it must
	// not carry one visitor's consent. The browser resolves it there instead.
	prefetch: building
		? undefined
		: await loadConsent(event, {
				backendURL: 'https://your-project.inth.app',
				// #hide docs
				...testBackend('backendURL'),
				// #endhide docs
			}),
});
// #endregion docs:layout-server
