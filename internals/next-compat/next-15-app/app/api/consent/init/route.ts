import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { createConsentRoute } from '@c15t/nextjs/api';

/**
 * Same-origin init: resolves `/init` from the cached manifest with this
 * request's geo headers, so browsers get a country without a backend call.
 * A fixed route file: the handler reads `init` from the last URL segment.
 */
export const { GET } = createConsentRoute({ config: COMPAT_CONSENT_CONFIG });
