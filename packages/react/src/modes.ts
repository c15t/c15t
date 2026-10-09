/**
 * `@c15t/react/modes` — the single-page app modes, defaulting to what the
 * build integration downloaded.
 *
 * `manifest()` and `hosted()` here read `@c15t/core/generated`, which
 * `consentManifest()` from `c15t/build` fills with the policy snapshot and
 * the backend URL. `c15t/react` exports these in place of the plain
 * `hosted()` from `@c15t/react`.
 *
 * The package index does not import this module. Server-framework packages
 * re-export the index, and their browser bundles must not import
 * `@c15t/core/generated`: Next.js fails the build when they do.
 *
 * @example
 * ```tsx
 * import { ConsentProvider, manifest } from 'c15t/react';
 *
 * <ConsentProvider options={{ mode: manifest() }}>{children}</ConsentProvider>;
 * ```
 */
export { hosted } from './transports/hosted';
export type { HostedOptions } from './transports/hosted';
export { manifest, manifestNeedsLocation } from './transports/manifest';
export type {
	BrowserManifestModeFactory,
	ManifestModeOptions,
} from './transports/manifest';
export { offline } from './transports/offline';
export type { OfflineModeOptions } from './transports/offline';
