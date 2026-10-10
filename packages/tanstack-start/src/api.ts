/**
 * `@c15t/tanstack-start/api` same-origin consent routes.
 *
 * Mount one splat server route and both endpoints exist:
 *
 * ```ts
 * // src/routes/api/c15t/$.ts
 * import { createFileRoute } from '@tanstack/react-router';
 * import { createConsentRoute } from '@c15t/tanstack-start/api';
 *
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: { handlers: createConsentRoute() },
 * });
 * ```
 *
 * - `GET /api/c15t/manifest` passes the cached backend manifest through
 *   with its cache headers, so browsers and CDNs can cache it.
 * - `GET /api/c15t/init` resolves init in-process from that manifest for
 *   the request's geo, language, and GPC signal. Pass
 *   `routePrefix: '/api/c15t'` to `createConsentStateHandler()` to use it;
 *   a client language switch re-hits it.
 *
 * The backend URL and the policy snapshot default to what
 * `consentManifest()` provides. By default `POST /subjects` is not
 * proxied: consent saves go straight to the backend, which mirrors the
 * Next.js and Nuxt adapters. Pass `proxy: true` to forward the remaining
 * consent paths through the same route, and `proxy: true` to
 * `createConsentStateHandler()` as well; see
 * {@link ConsentRouteOptions.proxy}.
 */
import {
	backendURL as generatedBackendURL,
	snapshot as generatedSnapshot,
} from '@c15t/core/generated';
import { createConsentRouteHandler } from '@c15t/core/server';
import type {
	ConsentProxyOptions,
	ConsentRouteFetchGvl,
	ConsentRouteRequestContext,
	ManifestCache,
} from '@c15t/core/server';
import type { ConsentManifest } from '@c15t/schema/types';

import { readConsentInputs } from './libs/request-inputs';

export type { ConsentProxyOptions } from '@c15t/core/server';

/** Options for {@link createConsentRoute}. */
export interface ConsentRouteOptions {
	/**
	 * Backend base URL that serves `/manifest`, for example
	 * `https://your-project.inth.app`. Defaults to the URL
	 * `consentManifest()` read from `VITE_C15T_BACKEND_URL` or
	 * `VITE_INTH_PROJECT_URL`. The proxy forwards to it.
	 */
	backendURL?: string;

	/**
	 * Full manifest URL. Overrides `${backendURL}/manifest`.
	 */
	manifestURL?: string;
	/**
	 * Deployment-bound manifest. Takes precedence over upstream URLs.
	 * Defaults to the snapshot `consentManifest()` fetched during the build.
	 * `undefined`, which a build that could not fetch the manifest produces,
	 * makes the server fetch the policy at runtime.
	 */
	snapshot?: ConsentManifest | undefined;

	/**
	 * Fetch implementation for manifest and GVL requests. Defaults to
	 * `globalThis.fetch`.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Custom Global Vendor List fetcher. Called only when the manifest
	 * enables IAB and the resolved policy is the IAB model.
	 */
	fetchGvl?: ConsentRouteFetchGvl;

	/**
	 * Manifest cache to read through. Defaults to the module-level cache
	 * shared with `resolveConsent()`.
	 */
	cache?: ManifestCache;

	/**
	 * Receives the promise of a background manifest revalidation started by
	 * this request, so the host can keep it alive past the response on
	 * runtimes that stop detached work once a response is sent (a platform
	 * `waitUntil`, for example). The promise never rejects. Not called when
	 * the manifest is fresh or the request itself waits on the upstream.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;

	/**
	 * Report each init the route resolves to the backend's `POST /sessions`,
	 * server-to-server and detached from the response, so the backend still
	 * counts visitors it never served `/init` to. The report is handed to
	 * `onBackgroundRevalidate` like a manifest refresh. Set `false` to send
	 * none.
	 *
	 * @default true
	 */
	reportSessions?: boolean;

	/**
	 * Resolve a relative `backendURL` or `manifestURL` against the
	 * request's `x-forwarded-host` and `x-forwarded-proto` instead of
	 * `request.url`. Off by default: those headers are client-controlled
	 * unless a trusted proxy strips them, and with the proxy enabled a
	 * forged one would redirect consent saves. Turn it on only behind such
	 * a proxy.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Forward consent traffic to `backendURL` through this route, so the
	 * browser only ever talks to the app's own origin, the way a Next.js
	 * app uses a `next.config` rewrite. Pass `proxy: true` to
	 * `createConsentStateHandler()` too, so the browser sends its saves
	 * here.
	 *
	 * When enabled the handlers gain `POST`, `PATCH`, `PUT`, `DELETE`, and
	 * `OPTIONS`, and `GET` falls through to the proxy for every path other
	 * than `manifest` and `init`, which stay resolved in-process. Only an
	 * allowlist of paths is forwarded (`subjects`, `subjects/:id`, `init`,
	 * `manifest`, `health`, `status`, plus {@link ConsentProxyOptions.paths});
	 * anything else is a 404, so the route is never an open proxy.
	 *
	 * The proxy forwards the browser's identity headers (`user-agent`,
	 * `accept-language`, `origin`, `referer`, `sec-gpc`, the geo headers),
	 * cookies only when {@link ConsentProxyOptions.cookieNames} names them,
	 * the client IP chain in `x-forwarded-for` only under
	 * `trustForwardedHeaders` (a client-controlled chain would let a visitor
	 * choose the address the backend sees), and adds
	 * `x-forwarded-host`, `x-forwarded-proto`, the c15t version header, and
	 * `x-c15t-proxy: @c15t/tanstack-start`. The hosted backend sits behind
	 * Vercel Firewall or Cloudflare, and a bare server-to-server fetch (server
	 * TLS fingerprint, no user agent, one egress IP for every visitor) scores
	 * as a bot. Forwarding those headers gives the WAF the same signals a
	 * direct browser request would carry, and `x-c15t-proxy` plus the version
	 * header give the platform a stable key for a firewall bypass rule.
	 *
	 * Operational note: Vercel Attack Challenge Mode and Cloudflare Super Bot
	 * Fight Mode still block the proxied `POST /subjects` unless the consent
	 * paths are exempted, because a server cannot solve a browser challenge.
	 *
	 * @defaultValue false
	 */
	proxy?: boolean | ConsentProxyOptions;
}

/**
 * The argument TanStack Start passes to a server route handler. Only the
 * fields the consent handlers read are declared, so plain objects work in
 * tests.
 */
export interface ConsentRouteHandlerContext {
	request: Request;
	params?: { _splat?: string };
}

/** A server route handler compatible with `server.handlers.GET`. */
export type ConsentRouteHandler = (
	context: ConsentRouteHandlerContext
) => Promise<Response>;

/** Handlers returned by {@link createConsentRoute}. */
export interface ConsentRouteHandlers {
	/**
	 * Splat handler: serves `manifest` and `init` under one file route. With
	 * `proxy` enabled, every other allowlisted path is forwarded upstream.
	 */
	GET: ConsentRouteHandler;
}

/**
 * Handlers returned by {@link createConsentRoute} when `proxy` is enabled:
 * `GET` plus one proxy handler per write method.
 */
export interface ConsentProxyRouteHandlers extends ConsentRouteHandlers {
	POST: ConsentRouteHandler;
	PATCH: ConsentRouteHandler;
	PUT: ConsentRouteHandler;
	DELETE: ConsentRouteHandler;
	OPTIONS: ConsentRouteHandler;
}

/**
 * Picks the handler shape from the options: the proxy handlers when
 * `proxy` is set to anything truthy, the plain handlers otherwise.
 */
export type ConsentRouteHandlersFor<Options extends ConsentRouteOptions> =
	Options extends { proxy: true | ConsentProxyOptions }
		? ConsentProxyRouteHandlers
		: ConsentRouteHandlers;

/**
 * Creates the handlers for the same-origin consent route,
 * `src/routes/api/c15t/$.ts`. The splat names the consent path.
 *
 * @param options - Backend, snapshot, fetch, GVL, cache, and proxy
 * options. The backend URL and snapshot default to what
 * `consentManifest()` provides.
 * @returns Handlers for `createFileRoute('/api/c15t/$')({ server: { handlers } })`.
 * With `proxy` off the set is `GET`; with it on, `POST`, `PATCH`, `PUT`,
 * `DELETE` and `OPTIONS` join. Manifest and init requests fail when there
 * is no snapshot, backend URL or `manifestURL`. Proxy writes need a
 * backend URL.
 * @example
 * ```ts
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: { handlers: createConsentRoute() },
 * });
 * ```
 * @example
 * ```ts
 * // Saves go through the route too. Pass `proxy: true` and the same
 * // `routePrefix` to createConsentStateHandler().
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: { handlers: createConsentRoute({ proxy: true }) },
 * });
 * ```
 */
export const createConsentRoute = function createConsentRoute<
	Options extends ConsentRouteOptions = ConsentRouteOptions,
>(options?: Options): ConsentRouteHandlersFor<Options> {
	const resolved: ConsentRouteOptions = options ?? {};
	const handle = createConsentRouteHandler({
		adapter: '@c15t/tanstack-start',
		backendURL: resolved.backendURL ?? generatedBackendURL,
		cache: resolved.cache,
		fetch: resolved.fetch,
		fetchGvl: resolved.fetchGvl,
		manifest: 'snapshot' in resolved ? resolved.snapshot : generatedSnapshot,
		manifestURL: resolved.manifestURL,
		proxy: resolved.proxy,
		reportSessions: resolved.reportSessions,
		trustForwardedHeaders: resolved.trustForwardedHeaders,
	});

	/**
	 * The request as core sees it: the router's `_splat` (absent in tests
	 * and custom mounts, where the last path segment decides), and the
	 * inputs the request middleware already resolved, so the init route
	 * agrees with the render.
	 */
	const contextFor = function contextFor(
		{ params, request }: ConsentRouteHandlerContext,
		route?: ConsentRouteRequestContext['route']
	): ConsentRouteRequestContext {
		return {
			inputs: readConsentInputs(request),
			path: params?._splat,
			route,
			waitUntil: resolved.onBackgroundRevalidate,
		};
	};

	const GET: ConsentRouteHandler = (context) =>
		handle(context.request, contextFor(context));
	if (!resolved.proxy) {
		const handlers: ConsentRouteHandlers = { GET };
		return handlers as ConsentRouteHandlersFor<Options>;
	}
	const proxyHandler: ConsentRouteHandler = (context) =>
		handle(context.request, contextFor(context, 'proxy'));
	const proxied: ConsentProxyRouteHandlers = {
		DELETE: proxyHandler,
		GET,
		OPTIONS: proxyHandler,
		PATCH: proxyHandler,
		POST: proxyHandler,
		PUT: proxyHandler,
	};
	return proxied as ConsentRouteHandlersFor<Options>;
};
