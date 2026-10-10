// After the resolver, so bundlers place the snapshot next to the code and
// the English copy it shares the most strings with.
import { backendURL, snapshot } from '@c15t/core/generated';
/**
 * The single-page app `manifest()`: resolve init in the browser from the
 * consent manifest the build downloaded.
 */
import { manifest as browserManifest } from '@c15t/core/transports/manifest-browser';
import type {
	BrowserManifestModeFactory,
	BrowserManifestOptions,
} from '@c15t/core/transports/manifest-browser';

/** Options for {@link manifest}. Every one is optional. */
export type ManifestModeOptions = BrowserManifestOptions;

/**
 * Resolve init in the browser from the backend's consent manifest.
 *
 * With no options it uses what `consentManifest()` from
 * `@c15t/svelte/vite` downloaded: the snapshot, and the backend URL it
 * read from `VITE_C15T_BACKEND_URL` or `VITE_INTH_PROJECT_URL`. Saves
 * still go to that backend.
 * With `manifestURL`, that URL is fetched when the page loads and the
 * build's snapshot is not used. Without a snapshot, as after
 * `source: 'runtime'` or a dev server that could not reach the backend,
 * the manifest is fetched from the backend when the page loads.
 *
 * Only English base copy is bundled. Another language's copy loads the
 * first time a visitor resolves to it.
 *
 * Use it in a Svelte single-page app. In SvelteKit, set the mode on
 * `c15tHandle()` and render `ConsentRoot` instead.
 *
 * @param options - Overrides for the snapshot, backend and location.
 * @returns A transport factory for `ConsentProvider`'s `mode`.
 * @throws {Error} When there is no snapshot, `manifestURL` or `backendURL`.
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ConsentBanner, ConsentProvider, manifest } from '@c15t/svelte';
 * </script>
 *
 * <ConsentProvider mode={manifest()}>
 *   <ConsentBanner />
 * </ConsentProvider>
 * ```
 */
export const manifest = function manifest(
	options: ManifestModeOptions = {}
): BrowserManifestModeFactory {
	return browserManifest({
		// A `manifestURL` is fetched at runtime and `source: 'runtime'` asks
		// for the backend's, so both skip the build's snapshot. A snapshot of
		// your own replaces it.
		snapshot:
			options.manifestURL || options.source === 'runtime'
				? undefined
				: snapshot,
		...options,
		// Saves go to the build's backend, even when `manifestURL` names
		// where the policy comes from.
		backendURL: options.backendURL ?? backendURL,
	} as ManifestModeOptions);
};
