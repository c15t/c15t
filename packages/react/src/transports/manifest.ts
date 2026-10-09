import { backendURL as builtBackendURL, snapshot } from '@c15t/core/generated';
import { manifest as browserManifest } from '@c15t/core/transports/manifest-browser';
import type {
	BrowserManifestModeFactory,
	BrowserManifestOptions,
} from '@c15t/core/transports/manifest-browser';
/**
 * Manifest mode for the React provider: core's browser resolver, with the
 * policy and backend URL the build integration downloaded as defaults.
 */
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
 * @returns A transport factory for the provider's `mode`, carrying its
 * options.
 * @throws {Error} When no snapshot, manifest URL or backend URL is known.
 * @example
 * ```tsx
 * import { ConsentProvider, manifest } from 'c15t/react';
 *
 * <ConsentProvider options={{ mode: manifest() }}>{children}</ConsentProvider>;
 * ```
 */
export const manifest = function manifest(
	options: BrowserManifestOptions = {}
): BrowserManifestModeFactory {
	return browserManifest(
		withBuildDefaults(options, { backendURL: builtBackendURL, snapshot })
	);
};

export { manifestNeedsLocation } from '@c15t/core/transports/manifest-browser';
export type {
	BrowserManifestModeFactory,
	BrowserManifestOptions as ManifestModeOptions,
} from '@c15t/core/transports/manifest-browser';
