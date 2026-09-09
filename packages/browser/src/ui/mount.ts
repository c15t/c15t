import { generateThemeCSS } from '@c15t/ui/theme';

import { stylesheet } from '../generated/styles';
import type {
	ConsentClient,
	ConsentUIHandle,
	ConsentUIOptions,
} from '../types';
import { createBanner } from './banner';
import { createDialog } from './dialog';
import { h, prefersReducedMotion } from './dom';
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
	options: ConsentUIOptions
): string {
	const parts: string[] = [];
	if (options.styles !== false && !options.noStyle) {
		parts.push(stylesheet);
	}
	if (options.theme) {
		parts.push(generateThemeCSS(options.theme));
	}
	if (options.css) {
		parts.push(options.css);
	}
	return parts.join('\n');
};

/**
 * Follow the configured colour scheme on the UI wrapper.
 *
 * The stylesheet keys dark tokens off a `.c15t-dark` ancestor of
 * `.c15t-theme-root`; inside a shadow root nothing on `<html>` reaches
 * it, so the wrapper carries the class itself.
 */
const applyColorScheme = function applyColorScheme(
	wrapper: HTMLElement,
	host: HTMLElement,
	scheme: NonNullable<ConsentUIOptions['colorScheme']>
): () => void {
	const set = function set(dark: boolean): void {
		// The wrapper serves `.c15t-dark .c15t-theme-root`; the host serves the
		// `:host(.c15t-dark)` variants the generated sheet adds for `:root`.
		wrapper.classList.toggle('c15t-dark', dark);
		host.classList.toggle('c15t-dark', dark);
		host.style.colorScheme = dark ? 'dark' : 'light';
	};
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
 * @param client - The client to render.
 * @param options - Where and how to mount.
 * @returns A handle that re-renders or tears down.
 * @throws {Error} When `container` is a selector that matches nothing.
 *
 * @example
 * ```ts
 * const client = createConsentClient({ backendURL: 'https://x.c15t.dev' });
 * client.start();
 * mountConsentUI(client, { colorScheme: 'dark', trigger: true });
 * ```
 */
export const mountConsentUI = function mountConsentUI(
	client: ConsentClient,
	options: ConsentUIOptions = {}
): ConsentUIHandle {
	const container = resolveContainer(options.container);
	const useShadow = options.shadow ?? true;
	const host = h('div', { [HOST_ATTRIBUTE]: '' });
	const root: ShadowRoot | HTMLElement = useShadow
		? host.attachShadow({ mode: 'open' })
		: host;

	const styleText = buildStyleText(options);
	if (styleText) {
		root.append(h('style', {}, styleText));
	}

	const wrapper = h('div', { class: 'c15t-host' });
	const themeRoot = h('div', { class: 'c15t-theme-root' });
	wrapper.append(themeRoot);
	root.append(wrapper);
	container.append(host);

	const releaseScheme = applyColorScheme(
		wrapper,
		host,
		options.colorScheme ?? 'system'
	);

	const ctx: SurfaceContext = {
		client,
		disableAnimation: options.disableAnimation ?? prefersReducedMotion(),
		legalLinks: client.options.legalLinks,
		noStyle: options.noStyle ?? false,
		root: themeRoot,
	};

	const surfaces: Surface[] = [];
	if (options.banner !== false) {
		surfaces.push(
			createBanner(ctx, options.banner === true ? {} : (options.banner ?? {}))
		);
	}
	if (options.dialog !== false) {
		surfaces.push(
			createDialog(ctx, options.dialog === true ? {} : (options.dialog ?? {}))
		);
	}
	if (options.trigger) {
		surfaces.push(
			createTrigger(ctx, options.trigger === true ? {} : options.trigger)
		);
	}

	const update = function update(): void {
		const snapshot = client.getSnapshot();
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
