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
 * read from `VITE_C15T_BACKEND_URL`. Saves still go to that backend.
 * Without a snapshot, as after `source: 'runtime'` or a dev server that
 * could not reach the backend, the manifest is fetched when the page
 * loads.
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
		backendURL,
		// `source: 'runtime'` skips the build's snapshot; a snapshot of your
		// own replaces it.
		snapshot: options.source === 'runtime' ? undefined : snapshot,
		...options,
	} as ManifestModeOptions);
};
