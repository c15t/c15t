/**
 * The browser manifest mode for ES module builds. The resolver lives in
 * `@c15t/core/transports/manifest-browser`, shared with every adapter that
 * resolves a manifest in the browser; this wrapper adds the policy and
 * backend URL the build integration downloaded as defaults.
 */
import { backendURL as builtBackendURL, snapshot } from '@c15t/core/generated';
import { manifest as browserManifest } from '@c15t/core/transports/manifest-browser';
import type {
	BrowserManifestModeFactory,
	BrowserManifestOptions,
} from '@c15t/core/transports/manifest-browser';
import type { ConsentManifest } from '@c15t/schema/types';

/** What a build integration downloaded, as `@c15t/core/generated` exports it. */
export interface BuildOutput {
	backendURL?: string;
	snapshot?: ConsentManifest;
}

/**
 * Fill the options the page left out from the build: the backend URL unless
 * a `manifestURL` names its own, and the snapshot unless the page passed
 * one, a `manifestURL`, or `source: 'runtime'`.
 *
 * @param options - The page's options.
 * @param build - What the build downloaded.
 * @returns The options `manifest()` resolves with.
 * @internal
 */
export const withBuildDefaults = function withBuildDefaults(
	options: BrowserManifestOptions,
	build: BuildOutput
): BrowserManifestOptions {
	const settings: BrowserManifestOptions = { ...options };
	if (settings.manifestURL !== undefined) {
		return settings;
	}
	if (build.backendURL !== undefined && settings.backendURL === undefined) {
		settings.backendURL = build.backendURL;
	}
	if (
		build.snapshot &&
		settings.snapshot === undefined &&
		settings.source !== 'runtime'
	) {
		(settings as { snapshot?: ConsentManifest }).snapshot = build.snapshot;
	}
	return settings;
};

/**
 * Resolve the policy in the browser from the backend's consent manifest.
 *
 * Without options it uses what `consentManifest()` from `c15t/build`
 * downloaded: the snapshot and the backend URL from
 * `VITE_C15T_BACKEND_URL`, both served as `c15t/generated`. Without a
 * snapshot, such as in dev after a failed fetch, it fetches
 * `${backendURL}/manifest` at runtime. Saves go to the backend either way.
 *
 * @param options - Overrides: your own `snapshot`, `source: 'runtime'`, a
 * `manifestURL`, a `backendURL`, or the visitor's location as `inputs`.
 * @returns A transport factory for `mode`, carrying its options.
 * @throws {Error} When no snapshot, manifest URL or backend URL is known.
 * @example
 * ```ts
 * import { init, manifest } from '@c15t/browser';
 *
 * init({ mode: manifest() });
 * ```
 */
export const manifest = function manifest(
	options: BrowserManifestOptions = {}
): BrowserManifestModeFactory {
	return browserManifest(
		withBuildDefaults(options, { backendURL: builtBackendURL, snapshot })
	);
};

// oxlint-disable-next-line oxc/no-barrel-file -- Part of the public `manifest` export of @c15t/browser.
export { manifestNeedsLocation } from '@c15t/core/transports/manifest-browser';
export type {
	BrowserManifestModeFactory,
	BrowserManifestOptions as ManifestModeOptions,
} from '@c15t/core/transports/manifest-browser';
