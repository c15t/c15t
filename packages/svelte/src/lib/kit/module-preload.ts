/**
 * Adds a `<link rel="modulepreload">` tag for the chunk a provider's
 * preload marker names while SvelteKit renders (or prerenders) a page.
 *
 * The provider loads the script loader and the network blocker on demand,
 * as one chunk, so a page with scripts and blocker rules preloads one file.
 *
 * SvelteKit builds the server before the client, so no server module can
 * know what the client build names a chunk. `consentManifest()` from
 * `@c15t/svelte/vite`, next to the `sveltekit()` plugin, closes that gap:
 * once the client build has written its chunks, it replaces the placeholders
 * below in the server output with each chunk's URL. Without the plugin (or
 * in `vite dev`) the placeholders stay, and no link is added.
 */

/**
 * The on-demand chunks a page can preload: the one that holds the script
 * loader and the network blocker.
 */
export type PreloadChunkName = 'loader-and-blocker';

/**
 * Each chunk's URL, written into the server build by `consentManifest()`.
 *
 * @internal
 */
export const MODULE_PRELOAD_PLACEHOLDERS: Readonly<
	Record<PreloadChunkName, string>
> = {
	'loader-and-blocker': '__C15T_MODULEPRELOAD_LOADER_AND_BLOCKER__',
};

/** Read through a function so no bundler folds the placeholder checks. */
const chunkHrefs = (): Readonly<Record<PreloadChunkName, string>> =>
	MODULE_PRELOAD_PLACEHOLDERS;

const MARKER = /<meta name="c15t-modulepreload" content="(?<body>[^"]*)"/gu;
const NONCE = /^[\w+/=-]+$/u;
const SCRIPT_NONCE = /<script\b[^>]*\snonce="(?<nonce>[\w+/=-]+)"/u;
const HEAD_END = '</head>';

const escapeAttribute = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;');

/** A placeholder the plugin never replaced is not a URL. */
const isChunkURL = (href: string | undefined): href is string =>
	typeof href === 'string' && /\.m?js$/u.test(href);

/**
 * Add a link for every chunk the page's preload markers name, at the end
 * of `<head>`.
 *
 * The end of `<head>`, because Svelte hydrates the head's markers and would
 * trip over elements it did not render.
 *
 * `fetchpriority="low"`, because the runtime needs the chunk only once it
 * starts, after hydration. The browser requests some of SvelteKit's own
 * chunks only after earlier ones have loaded. Over HTTP/1.1 it hands out
 * its six connections by priority, then in request order, so at the
 * default (high) priority the c15t chunks, requested with the page, went
 * ahead of those app chunks and delayed hydration by about one round trip
 * on a slow network. One chunk rather than two also means one low-priority
 * request: with two, the second one waited for a free connection and the
 * blocker, and the requests it holds, came a round trip after the loader.
 *
 * The links take the marker's nonce (the provider's `nonce` option), else
 * the nonce SvelteKit put on its own scripts, so a nonce-based
 * `script-src` admits them.
 *
 * @param html - A chunk of the rendered page.
 * @param hrefs - Chunk URLs; the ones the plugin wrote by default.
 * @returns The chunk with the links; unchanged without a marker.
 * @internal
 */
export const injectModulePreloads = function injectModulePreloads(
	html: string,
	hrefs: Readonly<Record<string, string>> = chunkHrefs()
): string {
	const headEnd = html.indexOf(HEAD_END);
	if (headEnd === -1 || !html.includes('<meta name="c15t-modulepreload"')) {
		return html;
	}
	const pageNonce = SCRIPT_NONCE.exec(html)?.groups?.nonce;
	const seen = new Set<string>();
	let links = '';
	for (const [, body = ''] of html.slice(0, headEnd).matchAll(MARKER)) {
		const tokens = body.split(' ');
		const ownNonce = tokens
			.find((token) => token.startsWith('nonce='))
			?.slice('nonce='.length);
		const nonce = ownNonce && NONCE.test(ownNonce) ? ownNonce : pageNonce;
		const nonceAttribute = nonce ? ` nonce="${nonce}"` : '';
		for (const token of tokens) {
			const href = Object.hasOwn(hrefs, token) ? hrefs[token] : undefined;
			if (!isChunkURL(href) || seen.has(href)) {
				continue;
			}
			seen.add(href);
			links += `<link rel="modulepreload" href="${escapeAttribute(href)}" fetchpriority="low"${nonceAttribute}>`;
		}
	}
	return links ? html.slice(0, headEnd) + links + html.slice(headEnd) : html;
};
