import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';

/**
 * Same-origin init: resolves `/init` from the cached manifest with this
 * request's geo headers, so browsers get a country without a backend call.
 */
const handlers = createNextConsentRouteHandlers(COMPAT_CONSENT_CONFIG);

export const { GET } = handlers;
