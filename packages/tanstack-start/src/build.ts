import { createConsentManifestPlugin } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';

export type {
	ManifestBuildErrorMode,
	ManifestBuildOptions,
} from '@c15t/core/build';

/**
 * Serves the deployment's consent manifest and backend URL as the virtual
 * module `@c15t/core/generated` (also `c15t/generated`). `vite build`
 * fetches the manifest once the server bundle is known to read it, which
 * `createConsentStateHandler()` and `createConsentRoute()` do; `vite dev`
 * fetches when the server first loads the module.
 * `createConsentStateHandler()` and `createConsentRoute()` read the backend
 * URL and the snapshot from it, so they need no options. No file is
 * written into the app.
 *
 * The snapshot stays on the server: in the client environment, `snapshot`
 * is `undefined`. `backendURL` is public and reaches both.
 *
 * The backend URL comes from `backendURL` or, when that is omitted, from
 * `VITE_C15T_BACKEND_URL`, then `VITE_INTH_PROJECT_URL`, including `.env`
 * files. When `VITE_C15T_BACKEND_URL` is unset, the plugin sets
 * `import.meta.env.VITE_C15T_BACKEND_URL` to the URL it used, so server and
 * browser code read the same value.
 *
 * The fetch waits at most 10 seconds. When it fails, `vite build` stops with
 * an error, and `vite dev` logs a warning and serves `snapshot: undefined`,
 * so the server fetches the policy at runtime. Set
 * `onBuildError: 'runtime'` or `'fail'`, or the `C15T_ON_BUILD_ERROR`
 * environment variable, to use one behaviour in both. The fetch is skipped
 * for a `backendURL` that is not absolute http(s).
 *
 * @param options - Backend URL and `onBuildError`. The build appends
 * `/manifest`.
 * @returns A Vite plugin to place before the TanStack Start plugin.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `vite build`.
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
		envNames: ['VITE_C15T_BACKEND_URL', 'VITE_INTH_PROJECT_URL'],
		label: '@c15t/tanstack-start/build',
		serverRendered: true,
	});
