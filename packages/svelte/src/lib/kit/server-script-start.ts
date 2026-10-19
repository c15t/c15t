/**
 * Writes the provider's server start into the page as a `<script>` at the
 * end of `<body>`.
 *
 * The provider renders the start's code into a
 * `<meta name="c15t-server-start">` marker in `<svelte:head>` (see
 * `../server-script-start.ts`). This blanks the marker, so the HTML matches
 * what the browser hydrates, and adds the script before `</body>`, where it
 * runs before the app's JavaScript hydrates the page.
 */
import {
	registerServerScriptStart,
	SERVER_START_MARKER,
} from '../server-script-start';

const MARKER = new RegExp(
	`(?<open><meta name="${SERVER_START_MARKER}" content=")(?<code>[^"]*)(?<close>"(?: data-nonce="(?<nonce>[^"]*)")?)`,
	'gu'
);
const NONCE = /^[\w+/=-]+$/u;
const SCRIPT_NONCE = /<script\b[^>]*\snonce="(?<nonce>[\w+/=-]+)"/u;
const BODY_END = '</body>';

/** The marker's attribute value as Svelte escaped it, unescaped. */
const unescapeAttribute = (value: string): string =>
	value
		.replaceAll('&quot;', '"')
		.replaceAll('&lt;', '<')
		.replaceAll('&amp;', '&');

let loading: Promise<void> | undefined;

/**
 * Loads `serverScriptStart` once and registers it for providers rendering
 * on the server. A failed import skips the start, and the loader starts
 * the scripts after hydration; the next request retries.
 *
 * @internal
 */
export const loadServerScriptStart =
	function loadServerScriptStart(): Promise<void> {
		loading ??= (async () => {
			try {
				const { serverScriptStart } =
					await import('@c15t/core/runtime/script-server-start');
				registerServerScriptStart(serverScriptStart);
			} catch {
				loading = undefined;
			}
		})();
		return loading;
	};

/**
 * A page transform for one response that moves the server start from its
 * marker to the end of `<body>`. It keeps the script until the chunk with
 * `</body>` when the page streams.
 *
 * A chunk can end partway through a tag, so the transform holds the text
 * from the chunk's last `<` until the next chunk, and returns it with the
 * last one (`done`). A tag it matches has no `<` after its first character:
 * Svelte escapes `<` in attribute values.
 *
 * The script takes the marker's nonce (the provider's `nonce` option), else
 * the nonce SvelteKit put on its own scripts, so a nonce-based `script-src`
 * admits it. The tags it inserts take the same nonce.
 *
 * @returns The transform, which returns each chunk with the marker blanked
 * and the script added.
 * @internal
 */
export const createServerStartInjector = function createServerStartInjector(): (
	html: string,
	done: boolean
) => string {
	let code: string | undefined;
	let markerNonce: string | undefined;
	let pageNonce: string | undefined;
	let held = '';
	let injected = false;
	const transform = (html: string): string => {
		if (injected) {
			return html;
		}
		pageNonce ??= SCRIPT_NONCE.exec(html)?.groups?.nonce;
		let out = html;
		if (html.includes(`<meta name="${SERVER_START_MARKER}"`)) {
			out = html.replace(MARKER, (...match) => {
				const groups = match.at(-1) as Record<string, string | undefined>;
				if (!code && groups.code) {
					code = unescapeAttribute(groups.code);
					markerNonce = groups.nonce;
				}
				return `${groups.open}${groups.close}`;
			});
		}
		const end = out.lastIndexOf(BODY_END);
		if (!code || end === -1) {
			return out;
		}
		injected = true;
		const nonce = markerNonce ?? pageNonce;
		const nonceAttribute =
			nonce && NONCE.test(nonce) ? ` nonce="${nonce}"` : '';
		return `${out.slice(0, end)}<script${nonceAttribute}>${code}</script>${out.slice(end)}`;
	};
	return (html, done) => {
		const text = held + html;
		if (done || injected) {
			held = '';
			return transform(text);
		}
		const cut = text.lastIndexOf('<');
		held = cut === -1 ? text : text.slice(cut);
		return cut === -1 ? '' : transform(text.slice(0, cut));
	};
};
