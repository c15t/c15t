// #region docs:route-handlers
import { env } from '$env/dynamic/public';
import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';

// GET /api/c15t resolves the visitor from the cached policy manifest.
// GET /api/c15t/manifest serves that manifest. Other methods are not handled:
// the browser saves consent to the backend URL directly.
export const { GET } = createSvelteKitConsentRouteHandlers({
	backendURL: env.PUBLIC_C15T_BACKEND_URL,
});
// #endregion docs:route-handlers
