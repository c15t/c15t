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
 * - The app calls the backend's `/init` (`manifest` unset). Client manifest
 *   mode makes no `/init` request, and server manifest mode asks the Nuxt
 *   init route, which core's script does not address.
 * - Nothing replaces the request: no `consentSource`, `customFetch`,
 *   `experiment` (the arm travels with `/init`) or `prefetch`.
 *
 * The config is what both sides read: module options through the public
 * runtime config, with `app.config.ts` merged over them. A page whose
 * config the browser changes before the plugin runs (for example a client
 * plugin that picks a manifest mode per route) turns the script off with
 * the route rule `c15t: { initPrefetch: false }`; otherwise its early
 * request goes unused.
 *
 * The script carries the backend URL and protocol headers, nothing from the
 * request, so prerendered and cached shells can hold it.
 */
import { buildPrefetchScript } from '@c15t/core';

import type { RuntimeConsentConfig } from '../kernel';
import { resolveManifestMode } from '../manifest';

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
	config: Partial<RuntimeConsentConfig>;
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
	if (
		!input.shell ||
		input.routeRule?.initPrefetch === false ||
		resolveManifestMode(config) !== false ||
		config.consentSource ||
		config.customFetch ||
		config.experiment ||
		config.prefetch
	) {
		return undefined;
	}
	// The hosted transport's default, so both build the same URL.
	const backendURL = config.backendURL ?? '/api/c15t';
	if (!FETCHABLE_BACKEND_RE.test(backendURL)) {
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
