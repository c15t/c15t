/**
 * Hands the provider's server start to `c15tHandle`.
 *
 * When the visitor's consent already lets some `scripts` run, the server
 * render can run their setup and insert their tags from the HTML, before the
 * app hydrates. A Svelte component renders synchronously and cannot load
 * the server-only code itself, and a static import would ship it to the
 * browser. So `c15tHandle` loads it once, before it resolves the request,
 * and registers a start here; the provider calls it with its options while
 * it renders on the server.
 *
 * The start keeps the code for the request it renders, and the handle's
 * page transform adds it as a `<script>` at the end of `<body>`. The code
 * never passes through the HTML, so markup a page renders, such as
 * content from its users, can't become a script that carries the nonce.
 *
 * A registered symbol, not a module variable: the handle and the provider
 * can each load their own copy of this package.
 */
import type { serverScriptStart } from '@c15t/core/runtime/script-server-start';

/** The provider's runtime options, with its `prefetch` and `nonce`. */
export type ServerStartOptions = Parameters<typeof serverScriptStart>[0] & {
	nonce?: string;
};

/** Starts the scripts a server render allows, for the current request. */
export type ServerStart = (options: ServerStartOptions) => void;

const REGISTRY = Symbol.for('c15t.svelte.serverScriptStart');

interface Registry {
	[REGISTRY]?: ServerStart;
}

/**
 * Makes a start available to providers rendering on the server.
 *
 * @param start - Keeps the code for the request being rendered.
 * @internal
 */
export const registerServerScriptStart = function registerServerScriptStart(
	start: ServerStart
): void {
	(globalThis as Registry)[REGISTRY] = start;
};

/**
 * Hands a server render's options to the start `c15tHandle` registered.
 * Does nothing without `c15tHandle`.
 *
 * @param options - The provider's runtime options, with its `prefetch`.
 * @internal
 */
export const startOnServer = function startOnServer(
	options: ServerStartOptions
): void {
	(globalThis as Registry)[REGISTRY]?.(options);
};
