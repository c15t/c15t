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

const MISSING_BACKEND_URL =
	'Add consentManifest() from c15t/vue/vite to vite.config.ts and set VITE_C15T_BACKEND_URL, or pass `backendURL`.';

/**
 * Resolve the visitor's policy in the browser from the backend's consent
 * manifest, the default for single-page apps.
 *
 * Without options it uses the manifest and backend URL `consentManifest()`
 * downloaded during the build. With no build snapshot (a dev server that
 * could not reach the backend, or `source: 'runtime'`) it fetches
 * `${backendURL}/manifest` when the app starts. English copy is bundled;
 * other languages load on demand.
 *
 * The browser does not know where the visitor is, so a policy that depends
 * on location resolves as for an unknown location, with no request to the
 * backend. Pass `inputs` when the page knows the location, `geoURL` for a
 * route that answers it, or `initFallback: true` to ask the backend's
 * `/init` instead.
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
	const backendURL = options.backendURL ?? builtBackendURL;
	if (backendURL === undefined && options.manifestURL === undefined) {
		throw new Error(
			`c15t: manifest() has no backend URL. ${MISSING_BACKEND_URL}`
		);
	}
	const snapshot =
		options.snapshot ??
		(options.source === 'runtime' ? undefined : builtSnapshot);
	return browserManifest({
		initFallback: false,
		...options,
		backendURL,
		snapshot,
	} as BrowserManifestOptions);
};

/**
 * Ask the backend's `/init` for every visitor's policy.
 *
 * @param options - Hosted options. `backendURL` defaults to the URL
 * `consentManifest()` read from `VITE_C15T_BACKEND_URL`.
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
		throw new Error(
			`c15t: hosted() has no backend URL. ${MISSING_BACKEND_URL}`
		);
	}
	return coreHosted({ ...options, backendURL });
};
