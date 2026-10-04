/**
 * Turns the provider's preload marker into `<link rel="modulepreload">`
 * tags while SvelteKit renders (or prerenders) a page.
 *
 * SvelteKit builds the server before the client, so no server module can
 * know what the client build names a chunk. The `c15tPreload()` Vite plugin
 * from `@c15t/svelte/vite` closes that gap: once the client build has
 * written its chunks, it replaces the placeholders below in the server
 * output with each chunk's URL. Without the plugin (or in `vite dev`) the
 * placeholders stay, and the marker is dropped without a link.
 */

/** The on-demand chunks a page can preload. */
export type PreloadChunkName = 'network-blocker' | 'script-loader';

/**
 * Each chunk's URL, written into the server build by `c15tPreload()`.
 *
 * @internal
 */
export const MODULE_PRELOAD_PLACEHOLDERS: Readonly<
	Record<PreloadChunkName, string>
> = {
	'network-blocker': '__C15T_MODULEPRELOAD_NETWORK_BLOCKER__',
	'script-loader': '__C15T_MODULEPRELOAD_SCRIPT_LOADER__',
};

/** Read through a function so no bundler folds the placeholder checks. */
const chunkHrefs = (): Readonly<Record<PreloadChunkName, string>> =>
	MODULE_PRELOAD_PLACEHOLDERS;

const MARKER = /<!--c15t:modulepreload (?<body>[^>]*?)-->/gu;
const NONCE = /^[\w+/=-]+$/u;
const SCRIPT_NONCE = /<script\b[^>]*\snonce="(?<nonce>[\w+/=-]+)"/u;

const escapeAttribute = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;');

/** A placeholder the plugin never replaced is not a URL. */
const isChunkURL = (href: string | undefined): href is string =>
	typeof href === 'string' && /\.m?js$/u.test(href);

/**
 * Replace every preload marker in a page chunk with the links it names.
 *
 * The links take the marker's nonce (the provider's `nonce` option), else
 * the nonce SvelteKit put on its own scripts, so a nonce-based
 * `script-src` admits them.
 *
 * @param html - A chunk of the rendered page.
 * @param hrefs - Chunk URLs; the ones the plugin wrote by default.
 * @returns The chunk with each marker replaced; unchanged without one.
 * @internal
 */
export const injectModulePreloads = function injectModulePreloads(
	html: string,
	hrefs: Readonly<Record<string, string>> = chunkHrefs()
): string {
	if (!html.includes('<!--c15t:modulepreload ')) {
		return html;
	}
	const pageNonce = SCRIPT_NONCE.exec(html)?.groups?.nonce;
	const seen = new Set<string>();
	return html.replace(MARKER, (_marker, body: string) => {
		const tokens = body.trim().split(/\s+/u);
		const ownNonce = tokens
			.find((token) => token.startsWith('nonce='))
			?.slice('nonce='.length);
		const nonce = ownNonce && NONCE.test(ownNonce) ? ownNonce : pageNonce;
		const nonceAttribute = nonce ? ` nonce="${nonce}"` : '';
		let links = '';
		for (const token of tokens) {
			const href = Object.hasOwn(hrefs, token) ? hrefs[token] : undefined;
			if (!isChunkURL(href) || seen.has(href)) {
				continue;
			}
			seen.add(href);
			links += `<link rel="modulepreload" href="${escapeAttribute(href)}"${nonceAttribute}>`;
		}
		return links;
	});
};
