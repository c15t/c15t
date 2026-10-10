/**
 * The single-page app `hosted()`: core's hosted transport, with the backend
 * URL the build integration read as the default.
 */
import { hosted as coreHosted } from '@c15t/core';
import type { HostedModeFactory, HostedModeOptions } from '@c15t/core';
import { backendURL as builtBackendURL } from '@c15t/core/generated';

/**
 * Bundlers replace `process.env.NODE_ENV` at build time, so production
 * bundles drop the setup hint behind it.
 */
declare const process: { env: { NODE_ENV?: string } };

/** Options for {@link hosted}. `backendURL` defaults to the build's. */
export type HostedOptions = Omit<HostedModeOptions, 'backendURL'> & {
	/**
	 * Backend URL, relative (`/api/c15t`) or absolute. Defaults to the URL
	 * `consentManifest()` from `@c15t/svelte/vite` read from
	 * `PUBLIC_C15T_BACKEND_URL` or `VITE_C15T_BACKEND_URL`, then
	 * `PUBLIC_INTH_PROJECT_URL` or `VITE_INTH_PROJECT_URL`.
	 */
	backendURL?: string;
};

/**
 * Ask the backend's `/init` for every visitor's policy.
 *
 * With no options it sends requests to the backend URL `consentManifest()`
 * from `@c15t/svelte/vite` read. Use it in a Svelte single-page app. In
 * SvelteKit, pass `hosted()` from `@c15t/svelte/kit` to `c15tHandle()`.
 *
 * @param options - Backend URL, init headers and request overrides.
 * @returns A transport factory for `ConsentProvider`'s `mode`, carrying
 * its options.
 * @throws {Error} When no backend URL is passed and the build set none.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ConsentBanner, ConsentProvider, hosted } from '@c15t/svelte';
 * </script>
 *
 * <ConsentProvider mode={hosted()}>
 *   <ConsentBanner />
 * </ConsentProvider>
 * ```
 */
export const hosted = function hosted(
	options: HostedOptions = {}
): HostedModeFactory {
	const backendURL = options.backendURL ?? builtBackendURL;
	if (backendURL === undefined) {
		let hint = '';
		try {
			if (process.env.NODE_ENV !== 'production') {
				hint =
					' Add consentManifest() from @c15t/svelte/vite to vite.config.ts and set VITE_C15T_BACKEND_URL (or VITE_INTH_PROJECT_URL), or pass `backendURL`.';
			}
		} catch {
			// No bundler and no `process`: the short message has to do.
		}
		throw new Error(`c15t: hosted() has no backend URL.${hint}`);
	}
	return coreHosted({ ...options, backendURL });
};
