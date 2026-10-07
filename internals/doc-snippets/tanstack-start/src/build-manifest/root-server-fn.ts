// #region docs:build-manifest-server-fn title="src/routes/__root.tsx"
import { createServerFn } from '@tanstack/react-start';
// #hide docs
import { createConsentServerRoute } from 'c15t/tanstack-start/api';
// #endhide docs
import { createConsentStateHandler } from 'c15t/tanstack-start/server';

import { consentOptions } from '../consent-options.server';

const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler(consentOptions)
);
// #endregion docs:build-manifest-server-fn

// Type-checks the route usage the build-manifest docs show as a fragment.
export { getConsentState };
export const consentRouteHandlers = createConsentServerRoute(consentOptions);
