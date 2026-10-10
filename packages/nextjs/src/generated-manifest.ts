/**
 * `@c15t/nextjs/generated-manifest` — the build-time manifest the server
 * helpers fall back to.
 *
 * `withConsentManifest` writes the snapshot to
 * `node_modules/.cache/c15t/manifest.js` and aliases this specifier to it,
 * in both Turbopack and webpack, so `resolveConsent` and the route handlers
 * read the deployment's snapshot without the app passing it. Without the
 * wrapper, or where the bundler does not apply the alias (a server package
 * left external), this module stands in and exports `undefined`, and the
 * server reads the manifest at runtime instead.
 *
 * @internal
 */
import type { ConsentManifest } from '@c15t/schema/types';

export const backendURL: string | undefined = undefined;
export const snapshot: ConsentManifest | undefined = undefined;
