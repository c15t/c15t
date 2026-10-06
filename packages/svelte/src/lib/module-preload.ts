/**
 * The marker a provider renders into `<svelte:head>` to name the on-demand
 * runtime chunk its page starts with.
 *
 * The provider loads the script loader and the network blocker on demand,
 * as one chunk, so a page without scripts or blocker rules never downloads
 * them. A page with either would fetch the chunk only once the runtime
 * starts, one round trip after the app's own JavaScript. `c15tHandle` reads this marker
 * during the server render (and the prerender) and adds
 * `<link rel="modulepreload">` tags, so the browser fetches the chunk
 * alongside the app's code.
 *
 * The marker is `<meta name="c15t-modulepreload" content="…">`, rendered
 * the same on the server and in the browser, so hydration keeps it. The
 * links go at the end of `<head>`, outside what Svelte hydrates.
 */

import type { PreloadChunkName } from './kit/module-preload';

/** Options that decide which on-demand chunks a runtime mounts on start. */
interface ModulePreloadOptions {
	enabled?: boolean;
	networkBlocker?: unknown;
	nonce?: string;
	scripts?: readonly unknown[];
}

/**
 * The marker's `content` for a provider's options: the chunk name and an
 * optional `nonce=…`, or `''` when its page starts with no on-demand chunk.
 *
 * Mirrors the runtime's own rule: the script loader mounts whenever
 * `scripts` is non-empty, the network blocker only while consent
 * management is enabled. Either one loads the shared chunk.
 *
 * @param options - The provider's options.
 * @returns The marker content.
 * @internal
 */
export const modulePreloadMarker = function modulePreloadMarker(
	options: ModulePreloadOptions
): string {
	const hasScripts = Boolean(options.scripts && options.scripts.length > 0);
	const hasBlocker =
		options.enabled !== false && Boolean(options.networkBlocker);
	if (!hasScripts && !hasBlocker) {
		return '';
	}
	const chunk: PreloadChunkName = 'loader-and-blocker';
	return options.nonce ? `${chunk} nonce=${options.nonce}` : chunk;
};
