import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';

/**
 * Same-origin manifest route: proxies the backend `/manifest` through the
 * Next.js Data Cache so browsers and `prefetchInitialConsent` read it from
 * this origin.
 */
const handlers = createNextConsentRouteHandlers({
	backendURL: COMPAT_BACKEND_URL,
});

export const GET = handlers.manifestGET;
