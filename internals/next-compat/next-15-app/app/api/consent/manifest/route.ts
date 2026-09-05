import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';

/**
 * Same-origin manifest route: proxies the backend `/manifest` through the
 * in-process cache (and the Data Cache on the App Router) so browsers and
 * `prefetchInitialConsent` read it from this origin.
 */
const handlers = createNextConsentRouteHandlers(COMPAT_CONSENT_CONFIG);

export const GET = handlers.manifestGET;
