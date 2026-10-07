/**
 * `loadConsent` — the `+layout.server.ts` half of the SvelteKit layer.
 *
 * Returns a plain, serializable `ConsentState` to hand the provider as
 * `prefetch`. With a prefetch in hand the kernel resolves the policy on the
 * server, so the banner is in the first HTML instead of appearing a frame
 * after hydration. The resolution itself is `resolveRequestConsent` from
 * `@c15t/core/server`; this module supplies what SvelteKit knows about the
 * request: `event.request`, `event.url`, `event.fetch`, the platform's
 * `waitUntil`, and the inputs `c15tHandle` normalized.
 */
import { readWaitUntil, resolveRequestConsent } from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';
import type { RequestEvent } from '@sveltejs/kit';

import type { C15tLocals, ConsentRequestOptions, ConsentState } from './types';

/** Options for {@link loadConsent}. */
export interface LoadConsentOptions extends ConsentRequestOptions {
	/** Deployment-bound manifest. Resolves locally using this visitor's inputs. */
	manifest?: ConsentManifest;
	/** Report manifest resolutions to the backend. @default true */
	reportSessions?: boolean;
	/**
	 * Keeps session reports and unfinished init requests alive after the response.
	 * Used when `event.platform.context.waitUntil` is unavailable. Pass the
	 * platform's `waitUntil`, such as the one from `@vercel/functions`.
	 */
	onBackgroundRevalidate?: (task: Promise<void>, event: RequestEvent) => void;
	/**
	 * Hosted mode: the c15t backend base URL, absolute or origin-relative.
	 * `loadConsent` calls its `/init` directly. A relative URL resolves
	 * against `event.url`.
	 */
	backendURL?: string;

	/**
	 * Manifest mode: the same-origin init route installed with
	 * {@link createSvelteKitConsentRouteHandlers}, e.g. `/api/c15t`.
	 * Takes precedence over `backendURL`.
	 *
	 * Fetched through `event.fetch`, so the request never leaves the process
	 * and SvelteKit forwards the page's cookies and headers for you.
	 */
	initRoute?: string;

	/**
	 * Extra request headers to forward upstream in hosted mode, such as a
	 * token a private backend needs. Like the consent cookie (the only
	 * cookie forwarded), they travel only over `https`, to a loopback host,
	 * or in-process. `cookie` and `forwarded`/`x-forwarded-*` cannot be
	 * named here.
	 */
	forwardHeaders?: string[];

	/**
	 * Hosted mode: resolve a relative `backendURL` against the request's
	 * `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers instead
	 * of `event.url`. Any client can send those headers, and `loadConsent`
	 * forwards the consent cookie to the resolved backend, so set this
	 * only behind a proxy that sets them and drops incoming ones. Prefer
	 * setting the origin where SvelteKit builds `event.url`: `paths.origin`
	 * in SvelteKit 3 (adapter-node's `ORIGIN` in SvelteKit 2, which
	 * SvelteKit 3 ignores), or the adapter's `HOST_HEADER` and
	 * `PROTOCOL_HEADER`. Also forwards the visitor IP to the backend as
	 * `x-forwarded-for`, which is skipped otherwise.
	 *
	 * @defaultValue false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Fetch for a hosted backend on another origin. Defaults to the global
	 * `fetch`; a URL on this app's origin always goes through `event.fetch`,
	 * in-process. A custom fetch keeps the vendor list inline, since the
	 * browser cannot replay it.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * The HTML this load feeds is served to every visitor, as a prerendered
	 * page is. A shared render carries no stored consent, clock, privacy
	 * signal or experiment (any of them would stop the browser reading the
	 * visitor's own cookie) and makes no upstream call, so the browser
	 * resolves the visitor itself. Pass SvelteKit's `building` flag, which
	 * is `true` while it prerenders: from `$app/environment` in SvelteKit 2,
	 * `$app/env` in SvelteKit 3. Defaults to the `shared` flag
	 * {@link c15tHandle} was given.
	 *
	 * @example
	 * ```ts
	 * import { building } from '$app/environment';
	 *
	 * export const load = async (event) => ({
	 *   prefetch: await loadConsent(event, { initRoute: '/api/c15t', shared: building }),
	 * });
	 * ```
	 */
	shared?: boolean;

	/**
	 * Longest `loadConsent` waits for the init route or the backend `/init`,
	 * in milliseconds. When it runs out, `loadConsent` returns the
	 * cookie-only config, the same as when the call fails: the page renders
	 * without consent UI in the server HTML, optional categories stay denied,
	 * and the browser resolves the policy after hydration. A hosted-mode
	 * request is aborted. An init route request finishes in the background,
	 * kept alive through the platform's `waitUntil` where it has one, and
	 * fills the manifest cache for the next render; it sends no session
	 * report, because the browser's own init reports the page view.
	 *
	 * `false` (or `Infinity`) waits for the upstream, however long it takes.
	 * Any other value that is not a finite, non-negative number uses the
	 * default.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;
}

const readLocals = function readLocals(
	event: RequestEvent
): C15tLocals | undefined {
	return (event.locals as { c15t?: C15tLocals }).c15t;
};

/** Prefer the adapter's hook; use the caller's hook on other platforms. */
const backgroundWorkFor = (
	event: RequestEvent,
	fallback: LoadConsentOptions['onBackgroundRevalidate']
) => {
	const platformHook = readWaitUntil(
		(event.platform as { context?: unknown } | undefined)?.context
	);
	return (
		platformHook ??
		(fallback ? (task: Promise<void>) => fallback(task, event) : undefined)
	);
};

/**
 * Loads the consent prefetch for a request.
 *
 * ```ts
 * // src/routes/+layout.server.ts
 * import { loadConsent } from '@c15t/svelte/kit';
 *
 * export const load = async (event) => ({
 *   prefetch: await loadConsent(event, { initRoute: '/api/c15t' }),
 * });
 * ```
 *
 * Then pass it straight through:
 *
 * ```svelte
 * <ConsentManagerProvider prefetch={data.prefetch} mode={hosted({ url: '/api/c15t' })}>
 * ```
 *
 * Modes:
 * - `initRoute` — manifest mode. Resolves against the same-origin init route
 *   in-process via `event.fetch`.
 * - `backendURL` — hosted mode. Calls the backend's `/init` directly.
 * - Neither — cookie and request context only. The client still initializes;
 *   the server just has nothing extra to seed.
 *
 * Never throws: a failed upstream call degrades to the cookie-only config
 * rather than taking the page down with it. Neither does a slow one: after
 * `timeoutMs` (500 ms by default) the cookie-only config is returned. A
 * prerendered page carries no visitor's consent and makes no upstream call.
 *
 * @param event - The SvelteKit request event from `load`.
 * @param options - Mode selection, cookie name, geo/language overrides, and
 * the time budget.
 * @returns A serializable `ConsentState` for the provider's `prefetch` prop.
 */
export const loadConsent = function loadConsent(
	event: RequestEvent,
	options: LoadConsentOptions = {}
): Promise<ConsentState> {
	const locals = readLocals(event);
	// Per-call inputs beat the handle's: a route that passes `country` is
	// naming the country for that page. The handle's cookie name is part of
	// the request context, so a per-call `country` keeps it.
	const overridesPerCall =
		options.country !== undefined ||
		options.language !== undefined ||
		options.region !== undefined;
	const cookieName = options.cookieName ?? locals?.cookieName;
	const { initRoute } = options;
	const mode = options.manifest ? 'manifest' : 'hosted';
	return resolveRequestConsent({
		adapter: '@c15t/svelte',
		backendURL: initRoute && !options.manifest ? undefined : options.backendURL,
		fetch: options.fetch,
		forwardHeaders: options.forwardHeaders,
		gvlRoute: options.manifest ? initRoute : undefined,
		initURL: initRoute,
		// SvelteKit answers this app's own routes in-process, so the init
		// route never leaves the server and the request's host never picks
		// where a relative backend goes.
		localFetch: event.fetch,
		manifest: options.manifest,
		mode:
			options.manifest || initRoute || options.backendURL ? mode : undefined,
		overrides: {
			country: options.country,
			language: options.language,
			region: options.region,
		},
		reportSessions: options.reportSessions,
		request: {
			headers: event.request.headers,
			inputs: locals && !overridesPerCall ? locals.inputs : undefined,
			url: event.url,
		},
		// A prerendered page is one HTML file for every visitor.
		shared: options.shared ?? locals?.shared === true,
		storage: cookieName ? { storageKey: cookieName } : undefined,
		timeoutMs: options.timeoutMs,
		trustForwardedHeaders: options.trustForwardedHeaders,
		waitUntil: backgroundWorkFor(event, options.onBackgroundRevalidate),
	});
};
