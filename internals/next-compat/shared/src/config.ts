import { defineConsentConfig } from '@c15t/nextjs';

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
 * Same-origin manifest route each app mounts with `@c15t/nextjs/api`.
 */
export const COMPAT_MANIFEST_URL = '/api/consent/manifest';

/**
 * Same-origin init route (the route handlers' `GET`): resolves init from the
 * cached manifest with the request's geo headers.
 */
export const COMPAT_INIT_URL = '/api/consent/init';

/**
 * The one config object the route files, the server helpers, and the
 * boundary all read.
 */
export const COMPAT_CONSENT_CONFIG = defineConsentConfig({
	backendURL: COMPAT_BACKEND_URL,
	initURL: COMPAT_INIT_URL,
	manifestURL: COMPAT_MANIFEST_URL,
});
