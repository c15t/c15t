// #region docs:build-manifest-server-fn title="src/routes/__root.tsx"
import { createServerFn } from '@tanstack/react-start';
// #hide docs
import { createConsentRoute } from 'c15t/tanstack-start/api';
// #endhide docs
import { createConsentStateHandler } from 'c15t/tanstack-start/server';

// Reads the backend URL and the policy consentManifest() downloaded.
const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler()
);
// #endregion docs:build-manifest-server-fn

// Type-checks the route usage the build-manifest docs show as a fragment.
export { getConsentState };
export const consentRouteHandlers = createConsentRoute();
