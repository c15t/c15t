// #region docs:consent-route
import { createConsentRoute } from 'c15t/next/api';

import { consentConfig } from '@/c15t.config';

export const { GET } = createConsentRoute(consentConfig);
// #endregion docs:consent-route
