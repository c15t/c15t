// #region docs:manifest-route
import { createConsentRoute } from 'c15t/next/api';

import { consentOptions } from '@/c15t.server';

export const { GET } = createConsentRoute(consentOptions);
// #endregion docs:manifest-route
