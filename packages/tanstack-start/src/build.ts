import { consentManifest as createManifestPlugin } from '@c15t/core/build';
import type { ManifestBuildOptions } from '@c15t/core/build';

export type { ManifestBuildOptions } from '@c15t/core/build';

/** Vite environment variable that carries the backend URL. */
const BACKEND_URL_ENV = 'VITE_C15T_BACKEND_URL';

/** Options for {@link consentManifest}. */
export type ConsentManifestPluginOptions = Omit<
	ManifestBuildOptions,
	'backendURL'
> & {
	/**
	 * Absolute backend base URL. The build appends `/manifest`. Defaults to
	 * `VITE_C15T_BACKEND_URL` from Vite's environment, which includes
	 * `.env` files.
	 */
	backendURL?: string;
};

/**
 * Generates a deployment-bound manifest before Vite compiles the app.
 * Import the generated `consentManifest` in a server function and pass it as
 * `manifest` to `createConsentStateHandler` or `createConsentServerRoute`.
 * Runs once when a build or development server resolves its configuration.
 *
 * The backend URL comes from `backendURL` or, when that is omitted, from
 * `VITE_C15T_BACKEND_URL`. When the variable is unset, the plugin sets
 * `import.meta.env.VITE_C15T_BACKEND_URL` to the URL it used, so server and
 * browser code read the same value without repeating it.
 *
 * @param options - Backend URL and optional output settings. The build appends
 * `/manifest`. The file defaults
 * to `src/c15t-manifest.ts` and its type import to
 * `c15t/tanstack-start/static`.
 * @returns A Vite plugin to place before the TanStack Start plugin.
 * @throws {Error} When no backend URL is set, or the manifest cannot be
 * fetched or written.
 * @example
 * ```ts
 * import { consentManifest } from 'c15t/tanstack-start/build';
 *
 * // Reads VITE_C15T_BACKEND_URL, for example from `.env`.
 * const plugins = [consentManifest()];
 * ```
 */
export const consentManifest = (options: ConsentManifestPluginOptions = {}) => {
	let plugin: ReturnType<typeof createManifestPlugin> | undefined;
	return {
		apply: (_config: unknown, environment: { isPreview?: boolean }) =>
			!environment.isPreview,
		configResolved: async (config: {
			root: string;
			env?: Record<string, unknown>;
		}) => {
			const fromEnv = config.env?.[BACKEND_URL_ENV];
			const backendURL =
				options.backendURL ??
				(typeof fromEnv === 'string' && fromEnv ? fromEnv : undefined);
			if (!backendURL) {
				throw new Error(
					`@c15t/tanstack-start/build: pass backendURL to consentManifest() or set ${BACKEND_URL_ENV}.`
				);
			}
			// Vite reads the resolved env when it transforms modules, so this
			// reaches `import.meta.env` in server and browser code. A value the
			// app already set is left alone.
			if (config.env && !fromEnv) {
				config.env[BACKEND_URL_ENV] = backendURL;
			}
			plugin ??= createManifestPlugin({
				...options,
				backendURL,
				importSource: options.importSource ?? 'c15t/tanstack-start/static',
			});
			await plugin.configResolved(config);
		},
		enforce: 'pre' as const,
		name: 'c15t:consent-manifest',
	};
};
