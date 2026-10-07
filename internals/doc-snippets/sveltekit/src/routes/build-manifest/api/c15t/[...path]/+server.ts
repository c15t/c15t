// #region docs:build-manifest-route title="src/routes/api/c15t/[...path]/+server.ts"
import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';

import { consentOptions } from '#lib/server/c15t.js';

export const { GET } = createSvelteKitConsentRouteHandlers(consentOptions);
// #endregion docs:build-manifest-route
