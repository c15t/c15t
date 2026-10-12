'use client';

import { useContext, useEffect, useSyncExternalStore, version } from 'react';

import { GlobalThemeContext } from '~/context/theme-context';
import { useUIConfig } from '~/ui-config-context';

/** A stylesheet from `@c15t/ui/styles/sheets/*`. */
export interface SurfaceStyleSheet {
	/** Dedupes the stylesheet: a page renders each `id` once. */
	id: string;
	/** The stylesheet text. Empty for a deferred sheet. */
	css: string;
	/**
	 * Loads the text of a deferred sheet. A browser bundle gets one in place
	 * of `css` when the framework already put the sheet in the server HTML,
	 * as the Next.js adapter does, so the text ships once.
	 */
	load?: () => Promise<string>;
}

/** Deferred sheets' text, by `id`, once loaded or read from the page. */
const loadedCss = new Map<string, string>();
/** Deferred sheets the server put in `<head>`, where React keeps them. */
const hoistedInPage = new Set<string>();
const pendingLoads = new Map<string, Promise<void>>();
/**
 * Deferred sheets whose last load failed. Their surfaces show without them:
 * an unstyled consent banner beats a hidden one.
 */
const failedLoads = new Set<string>();
const listeners = new Set<() => void>();
/** Bumped on each change, so a mounted `SurfaceStyles` renders new text. */
let sheetsVersion = 0;
const getSheetsVersion = (): number => sheetsVersion;
const getServerSheetsVersion = (): number => 0;

const notify = function notify(): void {
	sheetsVersion += 1;
	for (const listener of listeners) {
		listener();
	}
};

const subscribe = function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/**
 * Whether the page already holds a deferred sheet's rules: a hoisted
 * `<style data-href>` (React adopts it and ignores the text it is given), or
 * an in-place `<style data-c15t-styles>`, whose text is kept so a later
 * surface can render it after this one unmounts.
 */
const findInPage = function findInPage(id: string): boolean {
	if (hoistedInPage.has(id) || loadedCss.has(id)) {
		return true;
	}
	if (typeof document === 'undefined') {
		return false;
	}
	if (document.querySelector(`style[data-href~="${id}"]`)) {
		hoistedInPage.add(id);
		return true;
	}
	const inPlace = document.querySelector(`style[data-c15t-styles="${id}"]`);
	if (inPlace?.textContent) {
		loadedCss.set(id, inPlace.textContent);
		return true;
	}
	return false;
};

const isSheetReady = (sheet: SurfaceStyleSheet): boolean =>
	!sheet.load || failedLoads.has(sheet.id) || findInPage(sheet.id);

const loadSheet = async function loadSheet(
	id: string,
	load: () => Promise<string>
): Promise<void> {
	try {
		loadedCss.set(id, await load());
		failedLoads.delete(id);
	} catch (error) {
		pendingLoads.delete(id);
		failedLoads.add(id);
		throw error;
	} finally {
		notify();
	}
};

/**
 * Starts loading the deferred sheets the page does not hold yet. Safe to
 * call often: each sheet loads once, and the next call retries a failed
 * load.
 *
 * @internal
 */
export const preloadSurfaceSheets = async function preloadSurfaceSheets(
	sheets: readonly SurfaceStyleSheet[]
): Promise<void> {
	const loads: Promise<void>[] = [];
	for (const sheet of sheets) {
		const { id, load } = sheet;
		if (!load || findInPage(id)) {
			continue;
		}
		let pending = pendingLoads.get(id);
		if (!pending) {
			pending = loadSheet(id, load);
			pendingLoads.set(id, pending);
		}
		loads.push(pending);
	}
	try {
		await Promise.all(loads);
	} catch {
		// Its surfaces show without the failed sheet, and the next preload,
		// such as the next surface that mounts, retries it.
	}
};

/**
 * React 19 hoists a `<style>` with `href` and `precedence` into `<head>`,
 * on the server and in the browser, and renders each `href` once.
 */
const HOISTS_STYLES = Number.parseInt(version, 10) >= 19;

/** Groups c15t's `<style>` elements in `<head>`, in the order they render. */
const PRECEDENCE = 'c15t';

const useStylesDisabled = function useStylesDisabled(
	noStyle: boolean | undefined
): boolean {
	const { styles } = useUIConfig();
	const globalTheme = useContext(GlobalThemeContext);
	return styles === false || Boolean(noStyle) || Boolean(globalTheme.noStyle);
};

/**
 * Whether a surface can show: its deferred sheets are in the page or
 * loaded. Starts loading the missing ones after mount, so a surface that
 * renders later, like a banner waiting on the browser's consent fetch,
 * finds them ready. Hydration reads `true`: the server rendered the sheets
 * it rendered the surface with.
 *
 * @internal
 */
export const useSurfaceSheetsReady = function useSurfaceSheetsReady(
	sheets: readonly SurfaceStyleSheet[],
	noStyle?: boolean
): boolean {
	const disabled = useStylesDisabled(noStyle);
	const ready = useSyncExternalStore(
		subscribe,
		() => disabled || sheets.every(isSheetReady),
		() => true
	);
	useEffect(() => {
		if (!disabled) {
			void preloadSurfaceSheets(sheets);
		}
	}, [disabled, sheets]);
	return ready;
};

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
	const { nonce } = useUIConfig();
	// A sheet that failed to load can arrive later, under a surface that is
	// already showing.
	useSyncExternalStore(subscribe, getSheetsVersion, getServerSheetsVersion);
	if (useStylesDisabled(noStyle)) {
		return null;
	}
	const hoist = HOISTS_STYLES && !nonce;
	return sheets.map((sheet) => {
		let { css } = sheet;
		if (sheet.load) {
			if (!findInPage(sheet.id)) {
				// Not loaded yet. A hoisted style keeps the text it is created
				// with, so render it once the text is here.
				return null;
			}
			// A hoisted style already in `<head>` is adopted as it is.
			css = loadedCss.get(sheet.id) ?? '';
		}
		return hoist ? (
			<style
				key={sheet.id}
				href={sheet.id}
				precedence={PRECEDENCE}
			>
				{css}
			</style>
		) : (
			// Text children would be escaped, turning `>` in a selector
			// into `&gt;`.
			<style
				key={sheet.id}
				data-c15t-styles={sheet.id}
				nonce={nonce}
				// oxlint-disable-next-line react/no-danger -- c15t's own build-time CSS.
				dangerouslySetInnerHTML={{ __html: css }}
			/>
		);
	});
};
