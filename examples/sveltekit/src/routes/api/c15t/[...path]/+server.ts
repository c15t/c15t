// #region docs:consent-route
import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';

import { consentOptions } from '#lib/server/c15t.js';

// GET /api/c15t resolves the visitor from the bundled policy, for the browser
// on pages the server did not resolve, such as prerendered ones.
export const { GET } = createSvelteKitConsentRouteHandlers(consentOptions);
// #endregion docs:consent-route
