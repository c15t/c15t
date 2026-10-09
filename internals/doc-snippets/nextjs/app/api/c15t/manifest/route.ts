// #region docs:manifest-route
import { createNextConsentRouteHandlers } from 'c15t/next/api';

import { consentOptions } from '@/c15t.server';

export const { manifestGET: GET } =
	createNextConsentRouteHandlers(consentOptions);
// #endregion docs:manifest-route
