/**
 * Hands `serverScriptStart` from `c15tHandle` to the provider.
 *
 * For a returning visitor whose stored consent already lets some `scripts`
 * run, the server render can run their setup and insert their tags from the
 * HTML, before the app hydrates. A Svelte component renders synchronously
 * and cannot load the server-only code itself, and a static import would
 * ship it to the browser. So `c15tHandle` loads it once, before it resolves
 * the request, and registers it here; the provider reads it while it
 * renders on the server.
 *
 * The provider writes the code into a `<meta name="c15t-server-start">`
 * marker in `<svelte:head>`, which the handle's page transform blanks and
 * turns into a `<script>` at the end of `<body>`. The marker renders in the
 * browser too, with no code, so hydration keeps it.
 *
 * A registered symbol, not a module variable: the handle and the provider
 * can each load their own copy of this package.
 */
import type { serverScriptStart } from '@c15t/core/runtime/script-server-start';

/** The `<meta name>` of the marker the provider renders. */
export const SERVER_START_MARKER = 'c15t-server-start';

type ServerScriptStart = typeof serverScriptStart;

const REGISTRY = Symbol.for('c15t.svelte.serverScriptStart');

interface Registry {
	[REGISTRY]?: ServerScriptStart;
}

/**
 * Makes `serverScriptStart` available to providers rendering on the server.
 *
 * @param start - `serverScriptStart` from `@c15t/core`.
 * @internal
 */
export const registerServerScriptStart = function registerServerScriptStart(
	start: ServerScriptStart
): void {
	(globalThis as Registry)[REGISTRY] = start;
};

/**
 * The inline start for a server render, or `''` when nothing starts or
 * `c15tHandle` registered no start.
 *
 * @param options - The provider's runtime options, with its `prefetch`.
 * @returns The script's code.
 * @internal
 */
export const serverStartCode = function serverStartCode(
	options: Parameters<ServerScriptStart>[0]
): string {
	return (globalThis as Registry)[REGISTRY]?.(options) ?? '';
};
