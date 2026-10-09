/**
 * The stylesheets the stock Svelte surfaces render themselves.
 *
 * An app that imports no c15t stylesheet still gets styled surfaces. In
 * the browser, each surface inserts the sheets it uses into `<head>` as it
 * renders, once per page, before its own elements. On a server-rendered
 * SvelteKit page, the banner names its sheets in a `<meta>` marker and
 * `c15tHandle` writes them into the HTML, so no stylesheet `<link>` holds
 * back the first paint and the banner is styled before hydration.
 */
import * as firstPaint from '@c15t/ui/styles/sheets/first-paint';

/** A stylesheet from `@c15t/ui/styles/sheets/*`. */
export interface SurfaceStyleSheet {
	/** Dedupes the stylesheet: a page holds each `id` once. */
	readonly id: string;
	/** The stylesheet text. */
	readonly css: string;
}

/** What the banner, trigger and ConsentGate need. */
export const FIRST_PAINT_SHEETS: readonly SurfaceStyleSheet[] = [firstPaint];

/** Marks the `<style>` elements that hold a sheet; the value is its `id`. */
export const STYLE_ATTRIBUTE = 'data-c15t-styles';

/** Name of the `<meta>` marker a server-rendered surface leaves in `<head>`. */
export const STYLES_MARKER = 'c15t-styles';

/**
 * The marker's `content`: the sheet ids, space-separated, then an optional
 * `nonce=…` for the `<style>` elements `c15tHandle` writes.
 *
 * @param sheets - The surface's sheets.
 * @param nonce - The provider's `nonce` option.
 * @returns The marker content.
 * @internal
 */
export const stylesMarker = function stylesMarker(
	sheets: readonly SurfaceStyleSheet[],
	nonce: string | undefined
): string {
	const ids = sheets.map((sheet) => sheet.id).join(' ');
	return nonce ? `${ids} nonce=${nonce}` : ids;
};

/**
 * Insert each sheet the page does not hold yet into `<head>`, in order.
 *
 * Elements stay when the surface unmounts, so the next surface finds them.
 * A sheet `c15tHandle` already wrote into the page counts as held.
 *
 * Without the provider's `nonce`, new elements take the nonce of a sheet
 * `c15tHandle` wrote, else of a page script: SvelteKit puts its nonce on
 * both, and never hands it to components.
 *
 * @param sheets - The surface's sheets, in cascade order.
 * @param nonce - CSP nonce for the new `<style>` elements.
 * @internal
 */
export const ensureSurfaceStyles = function ensureSurfaceStyles(
	sheets: readonly SurfaceStyleSheet[],
	nonce: string | undefined
): void {
	if (typeof document === 'undefined') {
		return;
	}
	const pageNonce =
		nonce ||
		document.head.querySelector<HTMLStyleElement>(`style[${STYLE_ATTRIBUTE}]`)
			?.nonce ||
		document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce ||
		undefined;
	for (const sheet of sheets) {
		if (
			document.head.querySelector(`style[${STYLE_ATTRIBUTE}="${sheet.id}"]`)
		) {
			continue;
		}
		const element = document.createElement('style');
		element.setAttribute(STYLE_ATTRIBUTE, sheet.id);
		if (pageNonce) {
			element.nonce = pageNonce;
		}
		element.textContent = sheet.css;
		document.head.append(element);
	}
};
