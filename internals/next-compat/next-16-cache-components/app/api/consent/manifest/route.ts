import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { createConsentRoute } from '@c15t/nextjs/api';

/**
 * Same-origin manifest route: proxies the backend `/manifest` through the
 * in-process cache (and the Data Cache on the App Router) so browsers read
 * it from this origin. A fixed route file: the handler reads `manifest`
 * from the last URL segment.
 */
export const { GET } = createConsentRoute({ config: COMPAT_CONSENT_CONFIG });
