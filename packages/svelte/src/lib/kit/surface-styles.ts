/**
 * Writes the stylesheets a server-rendered surface named into the page.
 *
 * A stock surface that renders on the server leaves a
 * `<meta name="c15t-styles">` marker in `<head>` naming the sheets it
 * needs (see `../surface-styles.ts`). This puts those sheets into the HTML
 * as `<style>` elements, so the banner is styled on the first paint
 * without a stylesheet `<link>` that holds the paint back. In the browser,
 * the surfaces find these elements and add no second copy.
 */
import * as dialog from '@c15t/ui/styles/sheets/dialog';
import * as firstPaint from '@c15t/ui/styles/sheets/first-paint';
import * as primitives from '@c15t/ui/styles/sheets/primitives';

import { STYLE_ATTRIBUTE, STYLES_MARKER } from '../surface-styles';
import type { SurfaceStyleSheet } from '../surface-styles';

/** Every sheet a marker can name, in cascade order. */
const SHEETS: readonly SurfaceStyleSheet[] = [firstPaint, dialog, primitives];

const MARKER = new RegExp(
	`<meta name="${STYLES_MARKER}" content="(?<body>[^"]*)"`,
	'gu'
);
const NONCE = /^[\w+/=-]+$/u;
const SCRIPT_NONCE = /<script\b[^>]*\snonce="(?<nonce>[\w+/=-]+)"/u;
const HEAD_END = '</head>';

/**
 * Add a `<style>` for every sheet the page's markers name, once each, at
 * the end of `<head>`.
 *
 * The end of `<head>`, because Svelte hydrates the head's markers and would
 * trip over elements it did not render. The rules sit in cascade layers,
 * so their place after the app's stylesheets does not change what wins.
 *
 * The elements take the marker's nonce (the provider's `nonce` option),
 * else the nonce SvelteKit put on its own scripts, so a nonce-based
 * `style-src` admits them.
 *
 * @param html - A chunk of the rendered page.
 * @returns The chunk with the styles; unchanged without a marker.
 * @internal
 */
export const injectSurfaceStyles = function injectSurfaceStyles(
	html: string
): string {
	const headEnd = html.indexOf(HEAD_END);
	if (headEnd === -1 || !html.includes(`<meta name="${STYLES_MARKER}"`)) {
		return html;
	}
	const head = html.slice(0, headEnd);
	const pageNonce = SCRIPT_NONCE.exec(html)?.groups?.nonce;
	const wanted = new Set<string>();
	let nonce: string | undefined;
	for (const [, body = ''] of head.matchAll(MARKER)) {
		for (const token of body.split(' ')) {
			if (token.startsWith('nonce=')) {
				const own = token.slice('nonce='.length);
				nonce ??= NONCE.test(own) ? own : undefined;
			} else if (token) {
				wanted.add(token);
			}
		}
	}
	nonce ??= pageNonce;
	const nonceAttribute = nonce ? ` nonce="${nonce}"` : '';
	let styles = '';
	for (const sheet of SHEETS) {
		if (
			!wanted.has(sheet.id) ||
			head.includes(`${STYLE_ATTRIBUTE}="${sheet.id}"`)
		) {
			continue;
		}
		styles += `<style ${STYLE_ATTRIBUTE}="${sheet.id}"${nonceAttribute}>${sheet.css}</style>`;
	}
	return styles ? head + styles + html.slice(headEnd) : html;
};
