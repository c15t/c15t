import { createConsentManifestPlugin } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';

export type {
	ManifestBuildErrorMode,
	ManifestBuildOptions,
} from '@c15t/core/build';

/**
 * Generates a deployment-bound manifest before Vite compiles the app.
 * Import the generated `consentManifest` in a server function and pass it as
 * `manifest` to `createConsentStateHandler` or `createConsentServerRoute`.
 * Runs once when a build or development server resolves its configuration.
 *
 * The backend URL comes from `backendURL` or, when that is omitted, from
 * `VITE_C15T_BACKEND_URL`, including `.env` files. When the variable is
 * unset, the plugin sets `import.meta.env.VITE_C15T_BACKEND_URL` to the URL
 * it used, so server and browser code read the same value.
 *
 * The fetch waits at most 10 seconds. When it fails, `vite build` stops with
 * an error, and `vite dev` logs a warning and writes a module that exports
 * `undefined`, so the server fetches the policy at runtime. Set
 * `onBuildError: 'runtime'` or `'fail'`, or the `C15T_ON_BUILD_ERROR`
 * environment variable, to use one behaviour in both. The fetch is skipped
 * for a `backendURL` that is not absolute http(s).
 *
 * @param options - Backend URL and optional output settings. The build appends
 * `/manifest`. The file defaults
 * to `src/c15t-manifest.ts` and its type import to
 * `c15t/tanstack-start/static`.
 * @returns A Vite plugin to place before the TanStack Start plugin.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `vite build`, or the generated file cannot be written.
 * @example
 * ```ts
 * import { consentManifest } from 'c15t/tanstack-start/build';
 *
 * // Reads VITE_C15T_BACKEND_URL, for example from `.env`.
 * const plugins = [consentManifest()];
 * ```
 */
export const consentManifest = (options: ManifestBuildOptions = {}) =>
	createConsentManifestPlugin(options, {
		envNames: ['VITE_C15T_BACKEND_URL'],
		importSource: 'c15t/tanstack-start/static',
		label: '@c15t/tanstack-start/build',
	});
