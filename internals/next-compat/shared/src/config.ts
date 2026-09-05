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
