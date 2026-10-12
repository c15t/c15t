import { defineConsentConfig, manifest } from 'c15t/next';

import { testBackend } from './lib/test-backend';

/**
 * No `withConsentManifest` in `next.config.ts`: the server reads the
 * manifest at runtime through its cache, so the files that need this config
 * import it.
 */
export default defineConsentConfig({
	backendURL: 'https://your-project.inth.app',
	...testBackend('backendURL'),
	// Pages that pass no state resolve consent in the browser from the
	// manifest route, `app/api/c15t/manifest/route.ts`.
	mode: manifest({ resolve: 'browser' }),
	routePrefix: '/api/c15t',
});
