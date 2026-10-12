import { defineConsentConfig, hosted } from '@c15t/nextjs';

/**
 * Backend URL every fixture app proxies to its in-process stub.
 *
 * @remarks
 * Lives in a plain module on purpose. Importing a constant from a
 * `'use client'` module into a Server Component yields a client reference,
 * not the value, which silently breaks the server helpers.
 */
export const COMPAT_BACKEND_URL = '/api/c15t';

/**
 * Where each app mounts the consent route from `@c15t/nextjs/api` (or
 * `@c15t/nextjs/pages`), which serves `manifest` and `init`.
 */
export const COMPAT_ROUTE_PREFIX = '/api/consent';

/**
 * Same-origin manifest route under {@link COMPAT_ROUTE_PREFIX}.
 */
export const COMPAT_MANIFEST_URL = `${COMPAT_ROUTE_PREFIX}/manifest`;

/**
 * Hosted mode against the stub: the server helpers and the browser call
 * the backend `/init`.
 *
 * @remarks
 * No cell wraps its `next.config.ts` in `withConsentManifest`, so nothing
 * finds a `c15t.config.ts`; every helper and root gets its config passed
 * explicitly.
 */
export const COMPAT_HOSTED_CONFIG = defineConsentConfig({
	backendURL: COMPAT_BACKEND_URL,
	mode: hosted(),
});

/**
 * Manifest mode with the app's consent route: the server resolves init from
 * the backend `/manifest`, and the browser re-inits through
 * `${COMPAT_ROUTE_PREFIX}/init`, which resolves the cached manifest with the
 * request's geo headers. The route files read the same config.
 */
export const COMPAT_CONSENT_CONFIG = defineConsentConfig({
	backendURL: COMPAT_BACKEND_URL,
	routePrefix: COMPAT_ROUTE_PREFIX,
});

/**
 * Network-blocker rules for the tracker the network-blocker route calls from
 * `network-beacons.tsx`.
 */
export const COMPAT_TRACKER_RULES = [
	{ category: 'measurement' as const, domain: 'tracker.test' },
];
