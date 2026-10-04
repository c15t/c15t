/**
 * The marker a provider renders into `<svelte:head>` to name the on-demand
 * runtime chunks its page starts with.
 *
 * The provider loads the script loader and the network blocker on demand,
 * so a page without scripts or blocker rules never downloads them. A page
 * with them would fetch the chunk only once the runtime starts, one round
 * trip after the app's own JavaScript. `c15tHandle` turns this marker into
 * `<link rel="modulepreload">` tags during the server render (and the
 * prerender), so the browser fetches the chunk alongside the app's code.
 *
 * The marker is an HTML comment and identical on the server and in the
 * browser, so hydration keeps it and a page without the handle shows
 * nothing.
 */

/** Options that decide which on-demand chunks a runtime mounts on start. */
interface ModulePreloadOptions {
	enabled?: boolean;
	networkBlocker?: unknown;
	nonce?: string;
	scripts?: readonly unknown[];
}

/**
 * The marker for a provider's options, or `''` when its page starts with
 * no on-demand chunk.
 *
 * Mirrors the runtime's own rule: the script loader mounts whenever
 * `scripts` is non-empty, the network blocker only while consent
 * management is enabled.
 *
 * @param options - The provider's options.
 * @returns An HTML comment for `<svelte:head>`.
 * @internal
 */
export const modulePreloadMarker = function modulePreloadMarker(
	options: ModulePreloadOptions
): string {
	let chunks = '';
	if (options.scripts && options.scripts.length > 0) {
		chunks += ' script-loader';
	}
	if (options.enabled !== false && options.networkBlocker) {
		chunks += ' network-blocker';
	}
	if (!chunks) {
		return '';
	}
	const nonce = options.nonce ? ` nonce=${options.nonce}` : '';
	return `<!--c15t:modulepreload${chunks}${nonce}-->`;
};
