/**
 * The modes a plain Vue app passes to `app.use(c15tVue, { mode })`.
 *
 * Each is the transport itself, imported statically: a single-page app has
 * one environment, so a bundler drops the modes the app does not import.
 * `manifest()` and `hosted()` read the backend URL, and `manifest()` the
 * snapshot, from `@c15t/core/generated`, which `consentManifest()` from
 * `c15t/vue/vite` fills in during the build.
 */
import { hosted as coreHosted } from '@c15t/core';
import type { HostedModeFactory, HostedModeOptions } from '@c15t/core';
import {
	backendURL as builtBackendURL,
	snapshot as builtSnapshot,
} from '@c15t/core/generated';
import { manifest as browserManifest } from '@c15t/core/transports/manifest-browser';
import type {
	BrowserManifestModeFactory,
	BrowserManifestOptions,
} from '@c15t/core/transports/manifest-browser';

export { custom, offline } from '@c15t/core';
export type {
	HostedModeFactory,
	OfflineModeFactory,
	ProviderTransportFactory,
} from '@c15t/core';
export type { BrowserManifestModeFactory } from '@c15t/core/transports/manifest-browser';

/**
 * Bundlers replace `process.env.NODE_ENV` at build time, so production
 * bundles drop the setup hint behind it.
 */
declare const process: { env: { NODE_ENV?: string } };

/** The error for a mode with no backend URL, with the setup hint in dev. */
const missingBackendURL = function missingBackendURL(
	mode: 'hosted' | 'manifest'
): Error {
	let hint = '';
	try {
		if (process.env.NODE_ENV !== 'production') {
			hint =
				' Add consentManifest() from c15t/vue/vite to vite.config.ts and set VITE_C15T_BACKEND_URL (or VITE_INTH_PROJECT_URL), or pass `backendURL`.';
		}
	} catch {
		// No bundler and no `process`: the short message has to do.
	}
	return new Error(`c15t: ${mode}() has no backend URL.${hint}`);
};

/**
 * Resolve the visitor's policy in the browser from the backend's consent
 * manifest, the default for single-page apps.
 *
 * Without options it uses the manifest and backend URL `consentManifest()`
 * downloaded during the build. With `manifestURL` it fetches that URL when
 * the app starts and ignores the build's snapshot. With no build snapshot
 * (a dev server that could not reach the backend, or `source: 'runtime'`)
 * it fetches `${backendURL}/manifest` when the app starts. English copy is
 * bundled; other languages load on demand.
 *
 * The browser does not know where the visitor is, so when the policy
 * depends on location, the first visit asks the backend's `/init`, as in
 * every single-page app. Pass `inputs` when the page knows the location, or
 * `geoURL` for a route that answers it. `initFallback: false` resolves as
 * for an unknown location instead, with no request.
 *
 * @param options - Overrides for the build's backend URL and snapshot.
 * @returns A transport factory for `mode`.
 * @throws {Error} When no backend URL is set or derivable.
 * @example
 * ```ts
 * import { c15tVue, manifest } from 'c15t/vue/vue-plugin';
 *
 * app.use(c15tVue, { mode: manifest() });
 * ```
 */
export const manifest = function manifest(
	options: Partial<BrowserManifestOptions> = {}
): BrowserManifestModeFactory {
	// Test the build's URL on its own: a build that baked one in folds the
	// check, and its error message, away.
	if (
		builtBackendURL === undefined &&
		options.backendURL === undefined &&
		options.manifestURL === undefined
	) {
		throw missingBackendURL('manifest');
	}
	return browserManifest({
		// A `manifestURL` is fetched at runtime, so the build's snapshot is
		// left out, as with `source: 'runtime'`. A snapshot you pass replaces
		// it.
		snapshot:
			options.manifestURL || options.source === 'runtime'
				? undefined
				: builtSnapshot,
		...options,
		backendURL: options.backendURL ?? builtBackendURL,
	} as BrowserManifestOptions);
};

/**
 * Ask the backend's `/init` for every visitor's policy.
 *
 * @param options - Hosted options. `backendURL` defaults to the URL
 * `consentManifest()` read from `VITE_C15T_BACKEND_URL` or
 * `VITE_INTH_PROJECT_URL`.
 * @returns A transport factory for `mode`.
 * @throws {Error} When no backend URL is set.
 * @example
 * ```ts
 * import { c15tVue, hosted } from 'c15t/vue/vue-plugin';
 *
 * app.use(c15tVue, { mode: hosted() });
 * ```
 */
export const hosted = function hosted(
	options: Partial<HostedModeOptions> = {}
): HostedModeFactory {
	const backendURL = options.backendURL ?? builtBackendURL;
	if (backendURL === undefined) {
		throw missingBackendURL('hosted');
	}
	return coreHosted({ ...options, backendURL });
};
