/**
 * The `/init` request an `ssr: false` Nuxt page starts from its own HTML.
 *
 * Nuxt answers an `ssr: false` route with an HTML shell, and consent starts
 * only once the app's JavaScript has downloaded and run. An inline script in
 * the shell's `<head>`, core's `buildPrefetchScript`, starts `/init` while
 * the browser is still parsing. When the plugin starts the runtime, the
 * hosted transport finds that request on `window` and waits for it instead
 * of sending its own.
 *
 * The script is written only when the server can tell which request the
 * browser will make:
 *
 * - The page is a shell (`ssr: false` for the app or the route). A server
 *   rendered page already carries the visitor's policy.
 * - The app calls the backend's `/init`: `hosted()` mode, without init
 *   `headers`. `manifest()` asks the Nuxt consent route, which core's
 *   script does not address, or resolves in the browser; `offline()` makes
 *   no request.
 * - Nothing replaces the request: no `consentSource`, `experiment` (the
 *   arm travels with `/init`) or `prefetch`.
 *
 * The config is what both sides read: module options through the public
 * runtime config, with `app.config.ts` merged over them. A page whose
 * config the browser changes before the plugin runs (for example a client
 * plugin that changes the consent config per route) turns the script off with
 * the route rule `c15t: { initPrefetch: false }`; otherwise its early
 * request goes unused.
 *
 * The script carries the backend URL and protocol headers, nothing from the
 * request, so prerendered and cached shells can hold it.
 */
import { buildPrefetchScript } from '@c15t/core';
import { defu } from 'defu';

import type { RuntimeConsentConfig } from '../kernel';
import { readNuxtMode } from '../nuxt-mode';
import type { NuxtConsentModeConfig } from '../nuxt-mode';

/** The `c15t` key of a Nitro route rule. */
export interface InitPrefetchRouteRule {
	/** `false` writes no `/init` script into this route's HTML shell. */
	initPrefetch?: boolean;
}

/** What {@link buildInitPrefetchTag} decides from. */
export interface InitPrefetchInput {
	/**
	 * The c15t config the browser starts with: the public runtime config,
	 * with the app config merged over it.
	 */
	config: Partial<RuntimeConsentConfig> & NuxtConsentModeConfig;
	/** Whether the HTML is a shell the server did not render (`ssr: false`). */
	shell: boolean;
	/** The route's `c15t` route rule, if any. */
	routeRule?: InitPrefetchRouteRule;
	/**
	 * A nonce for this response, such as `nuxt-security`'s. Wins over the
	 * config's `nonce`.
	 */
	nonce?: string;
}

/** What a server render passes to {@link writeInitPrefetchTag}. */
export interface InitPrefetchRender {
	appConfig: { c15t?: Partial<RuntimeConsentConfig> } | undefined;
	context: {
		nuxt?: { noSSR?: boolean };
		security?: { nonce?: string };
	};
	head: string[];
	routeRules: {
		c15t?: InitPrefetchRouteRule;
		ssr?: boolean;
	};
	runtimeConfig: {
		c15t?: { ssr?: boolean };
		public: { c15t?: Partial<RuntimeConsentConfig> };
	};
	streaming?: boolean;
}

/** Matches the backend URLs the hosted transport fetches as written. */
const FETCHABLE_BACKEND_RE = /^(?:https?:\/\/|\/)/u;

const escapeAttribute = (value: string): string =>
	value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

/**
 * The inline `<script>` that starts this page's `/init` request, or
 * `undefined` when the page should not get one.
 *
 * @param input - The page's config, render kind, route rule and nonce.
 * @returns The tag, or `undefined`.
 * @internal
 */
export const buildInitPrefetchTag = function buildInitPrefetchTag(
	input: InitPrefetchInput
): string | undefined {
	const { config } = input;
	const mode = readNuxtMode(config);
	if (
		!input.shell ||
		input.routeRule?.initPrefetch === false ||
		mode.type !== 'hosted' ||
		Object.keys(mode.headers ?? {}).length > 0 ||
		config.consentSource ||
		config.experiment ||
		config.prefetch
	) {
		return undefined;
	}
	// The URL the browser's hosted transport asks, so both match.
	const backendURL = mode.backendURL ?? config.backendURL;
	if (!(backendURL && FETCHABLE_BACKEND_RE.test(backendURL))) {
		return undefined;
	}
	const nonce = input.nonce ?? config.nonce;
	const attributes = nonce ? ` nonce="${escapeAttribute(nonce)}"` : '';
	return `<script${attributes}>${buildPrefetchScript({ backendURL })}</script>`;
};

const CHARSET_RE = /<meta charset=[^>]*>/iu;

/**
 * Put the tag into the head chunks Nuxt passes to `render:html`: right
 * after `<meta charset>`, which must stay within the first 1024 bytes, and
 * before any stylesheet, which would hold an inline script until it loads.
 * Without a charset tag it goes first.
 *
 * @param head - `htmlContext.head`, edited in place.
 * @param tag - The tag from {@link buildInitPrefetchTag}.
 * @internal
 */
export const insertInitPrefetchTag = function insertInitPrefetchTag(
	head: string[],
	tag: string
): void {
	for (const [index, chunk] of head.entries()) {
		const charset = CHARSET_RE.exec(chunk);
		if (charset) {
			const end = charset.index + charset[0].length;
			head[index] = chunk.slice(0, end) + tag + chunk.slice(end);
			return;
		}
	}
	head.unshift(tag);
};

/**
 * Adds the `/init` script to one rendered page when it is an `ssr: false`
 * shell whose browser request the server can predict.
 *
 * @param render - The render's HTML head, event context and config.
 * @internal
 */
export const writeInitPrefetchTag = function writeInitPrefetchTag(
	render: InitPrefetchRender
): void {
	// Nuxt streams server-rendered pages only, never a shell. A
	// `consentSource` or `experiment` in `app.config.ts` rules the script out,
	// so without that file the browser starts `/init`.
	if (render.streaming || !render.appConfig) {
		return;
	}
	const tag = buildInitPrefetchTag({
		config: defu(render.appConfig.c15t, render.runtimeConfig.public.c15t),
		nonce: render.context.security?.nonce,
		routeRule: render.routeRules.c15t,
		shell:
			render.runtimeConfig.c15t?.ssr === false ||
			render.routeRules.ssr === false ||
			render.context.nuxt?.noSSR === true,
	});
	if (tag) {
		insertInitPrefetchTag(render.head, tag);
	}
};
