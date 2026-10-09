import { createConsentManifestPlugin } from '@c15t/core/build';
import type { ManifestBuildFallbackOptions } from '@c15t/core/build';

export type { ManifestBuildErrorMode } from '@c15t/core/build';

/** Options for {@link consentManifest}. */
export type ManifestBuildOptions = ManifestBuildFallbackOptions;

/**
 * Generates a deployment-bound manifest before Vite compiles the app.
 * Import the generated `consentManifest` in a server function and pass it as
 * `manifest` to `createConsentStateHandler` or `createConsentServerRoute`.
 * Runs once when a build or development server resolves its configuration.
 *
 * When the fetch fails or takes longer than 10 seconds, the build logs a
 * warning and the generated module exports `undefined`, so the server
 * fetches the policy at runtime. Set `onBuildError: 'fail'` to stop the
 * build instead. The build skips the fetch for a `backendURL` that is not
 * absolute http(s).
 *
 * @param options - Backend URL and optional output settings. The build appends
 * `/manifest`. The file defaults
 * to `src/c15t-manifest.ts` and its type import to
 * `c15t/tanstack-start/static`.
 * @returns A Vite plugin to place before the TanStack Start plugin.
 * @throws {Error} With `onBuildError: 'fail'`, when the manifest cannot be
 * fetched. Always, when the generated file cannot be written.
 * @example
 * ```ts
 * import { consentManifest } from 'c15t/tanstack-start/build';
 *
 * const plugins = [consentManifest({
 *   backendURL: 'https://your-project.inth.app',
 * })];
 * ```
 */
export const consentManifest = (options: ManifestBuildOptions) =>
	createConsentManifestPlugin(options, {
		importSource: 'c15t/tanstack-start/static',
		label: '@c15t/tanstack-start/build',
	});
