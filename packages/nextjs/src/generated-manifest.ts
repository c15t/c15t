/**
 * `@c15t/nextjs/generated-manifest` — the build-time manifest the server
 * helpers fall back to.
 *
 * `withConsentManifest` aliases this specifier to the `c15t-manifest.ts` it
 * writes, in both Turbopack and webpack, so `resolveConsent` and the route
 * handlers read the deployment's snapshot without the app passing it. Without
 * the wrapper, or where the bundler does not apply the alias (a server
 * package left external), this module stands in and exports `undefined`, and
 * the server reads the manifest at runtime instead.
 *
 * @internal
 */
import type { ConsentManifest } from '@c15t/schema/types';

export const consentManifest: ConsentManifest | undefined = undefined;
