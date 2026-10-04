/**
 * The marker a provider renders into `<svelte:head>` to name the on-demand
 * runtime chunks its page starts with.
 *
 * The provider loads the script loader and the network blocker on demand,
 * so a page without scripts or blocker rules never downloads them. A page
 * with them would fetch the chunk only once the runtime starts, one round
 * trip after the app's own JavaScript. `c15tHandle` reads this marker
 * during the server render (and the prerender) and adds
 * `<link rel="modulepreload">` tags, so the browser fetches the chunk
 * alongside the app's code.
 *
 * The marker is `<meta name="c15t-modulepreload" content="…">`, rendered
 * the same on the server and in the browser, so hydration keeps it. The
 * links go at the end of `<head>`, outside what Svelte hydrates.
 */

/** Options that decide which on-demand chunks a runtime mounts on start. */
interface ModulePreloadOptions {
	enabled?: boolean;
	networkBlocker?: unknown;
	nonce?: string;
	scripts?: readonly unknown[];
}

/**
 * The marker's `content` for a provider's options: the chunk names and an
 * optional `nonce=…`, or `''` when its page starts with no on-demand chunk.
 *
 * Mirrors the runtime's own rule: the script loader mounts whenever
 * `scripts` is non-empty, the network blocker only while consent
 * management is enabled.
 *
 * @param options - The provider's options.
 * @returns The marker content.
 * @internal
 */
export const modulePreloadMarker = function modulePreloadMarker(
	options: ModulePreloadOptions
): string {
	const chunks: string[] = [];
	if (options.scripts && options.scripts.length > 0) {
		chunks.push('script-loader');
	}
	if (options.enabled !== false && options.networkBlocker) {
		chunks.push('network-blocker');
	}
	if (chunks.length > 0 && options.nonce) {
		chunks.push(`nonce=${options.nonce}`);
	}
	return chunks.join(' ');
};
