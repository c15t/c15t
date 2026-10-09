'use client';

import { useContext, version } from 'react';

import { GlobalThemeContext } from '~/context/theme-context';
import { useUIConfig } from '~/ui-config-context';

/** A stylesheet from `@c15t/ui/styles/sheets/*`. */
export interface SurfaceStyleSheet {
	/** Dedupes the stylesheet: a page renders each `id` once. */
	id: string;
	/** The stylesheet text. */
	css: string;
}

/**
 * React 19 hoists a `<style>` with `href` and `precedence` into `<head>`,
 * on the server and in the browser, and renders each `href` once.
 */
const HOISTS_STYLES = Number.parseInt(version, 10) >= 19;

/** Groups c15t's `<style>` elements in `<head>`, in the order they render. */
const PRECEDENCE = 'c15t';

/**
 * Renders the stylesheets a stock surface needs as `<style>` elements.
 *
 * The banner, trigger, ConsentGate, dialog and widget each render the
 * sheets they use, so an app that imports no c15t stylesheet still gets
 * styled surfaces, and no stylesheet `<link>` holds back the first paint.
 * A server-rendered surface puts its rules in the HTML. A surface that
 * renders in the browser, like the dialog, inserts them with its own code.
 *
 * In React 19 the elements move to `<head>` and each `id` renders once per
 * page; later sheets follow earlier ones, which keeps the cascade order of
 * `styles.css`. React 18 renders them in place, next to the surface, and
 * so does React 19 when the provider sets a `nonce`: React drops the nonce
 * from a style it moves to `<head>` unless the app passed the same nonce to
 * React's server renderer, and a style without it would break a
 * nonce-based policy.
 *
 * Renders nothing when the provider sets `styles: false` (the app imports
 * `styles.css` itself) or `noStyle`.
 *
 * @param props.sheets - The stylesheets, in cascade order.
 * @param props.noStyle - The surface's own `noStyle` prop.
 * @returns The `<style>` elements, or `null`.
 * @internal
 */
export const SurfaceStyles = ({
	sheets,
	noStyle,
}: {
	sheets: readonly SurfaceStyleSheet[];
	noStyle?: boolean;
}) => {
	const { nonce, styles } = useUIConfig();
	const globalTheme = useContext(GlobalThemeContext);
	if (styles === false || noStyle || globalTheme.noStyle) {
		return null;
	}
	return sheets.map((sheet) =>
		HOISTS_STYLES && !nonce ? (
			<style
				key={sheet.id}
				href={sheet.id}
				precedence={PRECEDENCE}
			>
				{sheet.css}
			</style>
		) : (
			// Text children would be escaped, turning `>` in a selector
			// into `&gt;`.
			<style
				key={sheet.id}
				data-c15t-styles={sheet.id}
				nonce={nonce}
				// oxlint-disable-next-line react/no-danger -- c15t's own build-time CSS.
				dangerouslySetInnerHTML={{ __html: sheet.css }}
			/>
		)
	);
};
