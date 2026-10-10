import { defineConsentConfig, manifest } from 'c15t/next';

/**
 * The App Router guide's shared config, pointed at the local mock backend.
 * The shared `next.config.mjs` has no `withConsentManifest`, so the layout
 * and the client wrapper pass this config explicitly.
 */
export default defineConsentConfig({
	backendURL: '/mock-backend',
	// The browser resolves from `/mock-backend/manifest` when it re-inits.
	mode: manifest({ resolve: 'browser' }),
});
