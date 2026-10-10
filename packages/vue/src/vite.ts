import { createConsentManifestPlugin } from '@c15t/core/build';
import type {
	ConsentManifestPlugin,
	ManifestBuildOptions,
} from '@c15t/core/build';

export type {
	ConsentManifest,
	ManifestBuildErrorMode,
	ManifestBuildOptions,
} from '@c15t/core/build';

/**
 * Packages that ship `.vue` files. Vite's dependency pre-bundling cannot
 * load them, so they stay out of it, along with the `c15t` umbrella that
 * re-exports them.
 */
const VUE_SOURCE_PACKAGES = ['@c15t/vue', 'c15t'];

/** What {@link consentManifest} returns: one Vite plugin. */
export type VueConsentManifestPlugin = Omit<ConsentManifestPlugin, 'config'> & {
	config: () => ReturnType<ConsentManifestPlugin['config']>;
};

/**
 * The c15t Vite plugin for a plain Vue app. It serves the deployment's
 * consent manifest and backend URL as the virtual module
 * `@c15t/core/generated` (also `c15t/generated`), which `manifest()` and
 * `hosted()` from `c15t/vue/vue-plugin` read. No file is written into the
 * app. It also keeps `@c15t/vue`, whose components are `.vue` files, out of
 * dependency pre-bundling.
 *
 * `backendURL` defaults to `VITE_C15T_BACKEND_URL`, then
 * `VITE_INTH_PROJECT_URL`, including `.env` files. When
 * `VITE_C15T_BACKEND_URL` is unset, the plugin sets
 * `import.meta.env.VITE_C15T_BACKEND_URL` to the URL it used, so app code
 * reads the same value.
 *
 * `vite build` fetches the manifest only when the bundle uses `manifest()`,
 * so a `hosted()` or `offline()` build never depends on the backend. With
 * `manifest()`, a missing URL or a failed fetch stops `vite build`. `vite
 * dev` fetches when the app first loads the module and only warns, and
 * `manifest()` then fetches the manifest when the app starts. Set
 * `onBuildError` or `C15T_ON_BUILD_ERROR` to change that. When the policy
 * depends on the visitor's location, the build warns and suggests
 * `hosted()`.
 *
 * @param options - Backend URL and `onBuildError`. Appends `/manifest`.
 * @returns A Vite plugin.
 * @throws {Error} When the fetch fails in `'fail'` mode, the default for
 * `vite build`.
 * @example
 * ```ts
 * import vue from '@vitejs/plugin-vue';
 * import { consentManifest } from 'c15t/vue/vite';
 * import { defineConfig } from 'vite';
 *
 * export default defineConfig({
 * 	plugins: [vue(), consentManifest()],
 * });
 * ```
 */
export const consentManifest = (
	options: ManifestBuildOptions = {}
): VueConsentManifestPlugin => {
	const plugin = createConsentManifestPlugin(options, {
		adviseHostedForLocation: true,
		envNames: ['VITE_C15T_BACKEND_URL', 'VITE_INTH_PROJECT_URL'],
		label: '@c15t/vue/vite',
	});
	return {
		...plugin,
		config: () => {
			const config = plugin.config();
			return {
				...config,
				optimizeDeps: {
					exclude: [...config.optimizeDeps.exclude, ...VUE_SOURCE_PACKAGES],
				},
			};
		},
	};
};
