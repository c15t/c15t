// #region docs:route-handlers
import { createConsentRoute } from '@c15t/svelte/kit';

// GET /api/c15t/init resolves the visitor from the bundled policy, and
// GET /api/c15t/manifest serves it. Other methods are not handled: the
// browser saves consent to the backend URL directly. Pair it with
// `c15tHandle({ routePrefix: '/api/c15t' })`.
export const { GET } = createConsentRoute();
// #endregion docs:route-handlers
