import { consentManifest as createManifestPlugin } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';

export type { ManifestBuildOptions } from '@c15t/core/build';

/**
 * Generates a deployment-bound manifest before Vite compiles the app.
 * Import the generated `consentManifest` in a server function and pass it as
 * `manifest` to `createConsentStateHandler` or `createConsentServerRoute`.
 * Runs once when a build or development server resolves its configuration.
 *
 * @param options - Backend URL and optional output settings. The build appends
 * `/manifest`. The file defaults
 * to `src/c15t-manifest.ts` and its type import to
 * `c15t/tanstack-start/static`.
 * @returns A Vite plugin to place before the TanStack Start plugin.
 * @throws {Error} When the manifest cannot be fetched or written.
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
	createManifestPlugin({
		...options,
		importSource: options.importSource ?? 'c15t/tanstack-start/static',
	});
