import { applyExperimentTheme } from '@c15t/core';
import { generateThemeCSS } from '@c15t/ui/theme';
import type { Theme } from '@c15t/ui/theme';

import { stylesheet } from '../generated/styles';
import type {
	ConsentClient,
	ConsentUIHandle,
	ConsentUIOptions,
} from '../types';
import { createBanner } from './banner';
import { createDialog } from './dialog-surface';
import { h, prefersReducedMotion } from './dom';
import { createSlotApplier } from './slots';
import type { Surface, SurfaceContext } from './surface';
import { createTrigger } from './trigger';

const HOST_ATTRIBUTE = 'data-c15t-ui';

const resolveContainer = function resolveContainer(
	container: ConsentUIOptions['container']
): HTMLElement {
	if (typeof container === 'string') {
		const found = document.querySelector<HTMLElement>(container);
		if (!found) {
			throw new Error(
				`@c15t/browser: UI container ${JSON.stringify(container)} not found.`
			);
		}
		return found;
	}
	return container ?? document.body;
};

const buildStyleText = function buildStyleText(
	options: ConsentUIOptions,
	theme: Theme | undefined,
	extraStyles = ''
): string {
	const parts: string[] = [];
	if (options.styles !== false && !options.noStyle) {
		parts.push(stylesheet);
		parts.push(extraStyles);
	}
	if (theme) {
		parts.push(generateThemeCSS(theme));
	}
	if (options.css) {
		parts.push(options.css);
	}
	return parts.join('\n');
};

/**
 * Add the `stylesheetURLs` links to the UI root.
 *
 * A nonce-based `style-src` blocks an unnonced `<link>`, even in a shadow
 * root, so each link carries the client's nonce. Call it after the stock
 * `<style>` is in place, so that sheet's `@layer` order statement comes
 * first: a Tailwind 4 sheet's utilities then outrank the stock components.
 */
const appendStylesheetLinks = function appendStylesheetLinks(
	root: ShadowRoot | HTMLElement,
	options: ConsentUIOptions,
	nonce: string | undefined
): void {
	for (const href of options.stylesheetURLs ?? []) {
		const link = h('link', { href, rel: 'stylesheet' });
		if (nonce) {
			link.nonce = nonce;
		}
		root.append(link);
	}
};

/**
 * Follow the configured colour scheme on the UI wrapper.
 *
 * The stylesheet keys dark tokens off a `.c15t-dark` ancestor of
 * `.c15t-theme-root`; inside a shadow root nothing on `<html>` reaches
 * it, so the wrapper carries the class itself. For the same reason `null`
 * cannot simply leave the class alone, as it does in the framework
 * providers: the page's class would never reach the UI. It copies it
 * instead, from either `dark` or `c15t-dark` on `<html>`.
 */
const applyColorScheme = function applyColorScheme(
	wrapper: HTMLElement,
	host: HTMLElement,
	scheme: Exclude<ConsentUIOptions['colorScheme'], undefined>
): () => void {
	const set = function set(dark: boolean): void {
		// The wrapper serves `.c15t-dark .c15t-theme-root`; the host serves the
		// `:host(.c15t-dark)` variants the generated sheet adds for `:root`.
		wrapper.classList.toggle('c15t-dark', dark);
		host.classList.toggle('c15t-dark', dark);
		host.style.colorScheme = dark ? 'dark' : 'light';
	};
	if (scheme === null) {
		const html = document.documentElement;
		const follow = function follow(): void {
			set(
				html.classList.contains('dark') || html.classList.contains('c15t-dark')
			);
		};
		follow();
		const observer = new MutationObserver(follow);
		observer.observe(html, { attributeFilter: ['class'] });
		return () => {
			observer.disconnect();
		};
	}
	if (scheme !== 'system' || typeof window.matchMedia !== 'function') {
		set(scheme === 'dark');
		return () => {
			/* nothing to release */
		};
	}
	const query = window.matchMedia('(prefers-color-scheme: dark)');
	const onChange = function onChange(): void {
		set(query.matches);
	};
	onChange();
	query.addEventListener('change', onChange);
	return () => {
		query.removeEventListener('change', onChange);
	};
};

/**
 * Mount the banner, preference centre and trigger for a client.
 *
 * By default everything renders inside a shadow root on a host element
 * appended to `<body>`, carrying its own copy of the `@c15t/ui`
 * stylesheet, so a Framer or WordPress theme's global `button {}` rules
 * cannot reach it. Pass `shadow: false` to render into the page and style
 * it yourself.
 *
 * Every part named in `theme.slots` carries its slot key as a CSS part, so
 * page CSS reaches it through `[data-c15t-ui]::part(consentBannerCard)`
 * even inside the shadow root. A slot's classes need their rules in the
 * same root: in the page with `shadow: false`, or through `stylesheetURLs`
 * or `css` in shadow mode.
 *
 * @param client - The client to render.
 * @param options - Where and how to mount.
 * @returns A handle that re-renders or tears down.
 * @throws {Error} When `container` is a selector that matches nothing.
 *
 * @example
 * ```ts
 * const client = createConsentClient({
 *   mode: hosted({ backendURL: 'https://x.c15t.dev' }),
 * });
 * client.start();
 * mountConsentUI(client, { colorScheme: 'dark', trigger: true });
 * ```
 */
export const mountConsentUI = function mountConsentUI(
	client: ConsentClient,
	options: ConsentUIOptions = {},
	extension?: {
		stylesheet: string;
		createSurfaces: (ctx: SurfaceContext) => Surface[];
	}
): ConsentUIHandle {
	const container = resolveContainer(options.container);
	const useShadow = options.shadow ?? true;
	const host = h('div', { [HOST_ATTRIBUTE]: '' });
	const root: ShadowRoot | HTMLElement = useShadow
		? host.attachShadow({ mode: 'open' })
		: host;

	// The arm's theme overrides ride on the host theme. Assignment lands in
	// `start()`, before the UI mounts, so the first sheet already carries it;
	// `update()` re-renders the sheet if the arm changes later, and creates
	// it when a later arm is the first thing that needs one.
	const resolveTheme = function resolveTheme(): Theme | undefined {
		return applyExperimentTheme(
			options.theme,
			client.options.experiment,
			client.getSnapshot().experiment
		);
	};
	let renderedTheme = resolveTheme();
	const styleText = buildStyleText(
		options,
		renderedTheme,
		extension?.stylesheet
	);
	// A nonce-based `style-src` blocks an unnonced `<style>`, even in a
	// shadow root.
	const createStyle = function createStyle(text: string): HTMLStyleElement {
		const style = h('style', {}, text);
		if (client.options.nonce) {
			style.nonce = client.options.nonce;
		}
		return style;
	};
	let styleEl: HTMLStyleElement | null = null;
	if (styleText) {
		styleEl = createStyle(styleText);
		root.append(styleEl);
	}
	appendStylesheetLinks(root, options, client.options.nonce);

	const wrapper = h('div', { class: 'c15t-host' });
	const themeRoot = h('div', { class: 'c15t-theme-root' });
	wrapper.append(themeRoot);
	root.append(wrapper);
	container.append(host);

	let slotApplier = createSlotApplier(renderedTheme?.slots);

	const releaseScheme = applyColorScheme(
		wrapper,
		host,
		// `'system'` rather than the React provider's `.dark` mirroring: a
		// plain HTML page has no `.dark` convention, and a page that has
		// one opts in with `null`.
		options.colorScheme === undefined ? 'system' : options.colorScheme
	);

	const ctx: SurfaceContext = {
		client,
		disableAnimation: options.disableAnimation ?? prefersReducedMotion(),
		legalLinks: client.options.legalLinks,
		noStyle: options.noStyle ?? false,
		root: themeRoot,
		// Surfaces keep this function; it reads the current arm's slots, which
		// `update()` swaps before the surfaces rebuild for the new arm.
		slot: (element, key) => slotApplier(element, key),
	};

	const surfaces: Surface[] = [];
	surfaces.push(...(extension?.createSurfaces(ctx) ?? []));
	if (options.banner !== false) {
		surfaces.push(
			createBanner(ctx, options.banner === true ? {} : (options.banner ?? {}))
		);
	}
	if (options.dialog !== false) {
		surfaces.push(
			createDialog(
				ctx,
				options.dialog === true ? {} : (options.dialog ?? {}),
				options.trigger
			)
		);
	}
	if (options.trigger) {
		surfaces.push(
			createTrigger(ctx, options.trigger === true ? {} : options.trigger)
		);
	}

	const update = function update(): void {
		const snapshot = client.getSnapshot();
		const theme = resolveTheme();
		if (theme !== renderedTheme) {
			renderedTheme = theme;
			slotApplier = createSlotApplier(theme?.slots);
			const text = buildStyleText(options, theme, extension?.stylesheet);
			if (styleEl) {
				styleEl.textContent = text;
			} else if (text) {
				styleEl = createStyle(text);
				root.prepend(styleEl);
			}
		}
		for (const surface of surfaces) {
			surface.sync(snapshot);
		}
	};
	const unsubscribe = client.subscribe(update);
	update();

	return {
		destroy() {
			unsubscribe();
			releaseScheme();
			for (const surface of surfaces) {
				surface.destroy();
			}
			host.remove();
		},
		host,
		root,
		update,
	};
};
