/**
 * `@c15t/tanstack-start/api` same-origin consent routes.
 *
 * Mount one splat server route and both endpoints exist:
 *
 * ```ts
 * // src/routes/api/c15t/$.ts
 * import { createFileRoute } from '@tanstack/react-router';
 * import { createConsentServerRoute } from '@c15t/tanstack-start/api';
 *
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: {
 *     handlers: createConsentServerRoute({
 *       backendURL: 'https://your-project.inth.app',
 *     }),
 *   },
 * });
 * ```
 *
 * - `GET /api/c15t/manifest` passes the cached backend manifest through
 *   with its cache headers, so browsers and CDNs can cache it.
 * - `GET /api/c15t/init` resolves init in-process from that manifest for
 *   the request's geo, language, and GPC signal. `ConsentRoot` points
 *   `initURL` here by default; a client language switch re-hits it.
 *
 * By default `POST /subjects` is not proxied: consent saves go straight to
 * `backendURL`, which mirrors the Next.js and Nuxt adapters. Pass
 * `proxy: true` to forward the remaining consent paths through the same
 * route so `ConsentRoot` can use `backendURL="/api/c15t"`; see
 * {@link ConsentServerRouteOptions.proxy}.
 */
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

/** Options for {@link createConsentServerRoute}. */
export interface ConsentServerRouteOptions {
	/**
	 * Backend base URL that serves `/manifest`, for example
	 * `https://your-project.inth.app`. Pass this or `manifestURL`; the
	 * proxy needs this one.
	 */
	backendURL?: string;

	/**
	 * Full manifest URL. Overrides `${backendURL}/manifest`. Pass this or
	 * `backendURL`.
	 */
	manifestURL?: string;
	/** Deployment-bound manifest. Takes precedence over upstream URLs. */
	manifest?: ConsentManifest;

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
	 * browser only ever talks to the app's own origin and `ConsentRoot`
	 * can take `backendURL="/api/c15t"`, the way a Next.js app uses a
	 * `next.config` rewrite.
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
	 * Server-side `resolveConsent` must still receive the absolute backend
	 * URL: its self-route guard skips a relative `/api/c15t`.
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

/** Handlers returned by {@link createConsentServerRoute}. */
export interface ConsentServerRouteHandlers {
	/**
	 * Splat handler: serves `manifest` and `init` under one file route. With
	 * `proxy` enabled, every other allowlisted path is forwarded upstream.
	 */
	GET: ConsentRouteHandler;
	/** Manifest passthrough for a dedicated `/api/c15t/manifest` route. */
	manifestGET: ConsentRouteHandler;
	/** Init resolver for a dedicated `/api/c15t/init` route. */
	initGET: ConsentRouteHandler;
}

/**
 * Handlers returned by {@link createConsentServerRoute} when `proxy` is
 * enabled: the in-process handlers plus one proxy handler per write method.
 */
export interface ConsentProxyRouteHandlers extends ConsentServerRouteHandlers {
	POST: ConsentRouteHandler;
	PATCH: ConsentRouteHandler;
	PUT: ConsentRouteHandler;
	DELETE: ConsentRouteHandler;
	OPTIONS: ConsentRouteHandler;
	/**
	 * The bare proxy handler, for apps that mount it under another file
	 * route. Applies the same path allowlist and header shaping.
	 */
	proxyHandler: ConsentRouteHandler;
}

/**
 * Picks the handler shape from the options: the proxy handlers when
 * `proxy` is set to anything truthy, the plain handlers otherwise.
 */
export type ConsentServerRouteHandlersFor<
	Options extends ConsentServerRouteOptions,
> = Options extends { proxy: true | ConsentProxyOptions }
	? ConsentProxyRouteHandlers
	: ConsentServerRouteHandlers;

/**
 * Creates the same-origin consent route handlers.
 *
 * @param options - Manifest snapshot or backend location (`backendURL` or
 * `manifestURL`), fetch, GVL, cache, and proxy options.
 * @returns Handlers for `createFileRoute('/api/c15t/$')({ server: { handlers } })`.
 * With `proxy` off the set is `GET`, `manifestGET`, and `initGET`; with it
 * on, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`, and `proxyHandler` join.
 * Manifest and init handlers throw when none of `manifest`, `backendURL`, or
 * `manifestURL` is set. Proxy writes still require `backendURL`.
 * @example
 * ```ts
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: {
 *     handlers: createConsentServerRoute({
 *       backendURL: 'https://consent.example.com',
 *       proxy: true, // then <ConsentRoot backendURL="/api/c15t" />
 *     }),
 *   },
 * });
 * ```
 */
export const createConsentServerRoute = function createConsentServerRoute<
	Options extends ConsentServerRouteOptions = ConsentServerRouteOptions,
>(options: Options): ConsentServerRouteHandlersFor<Options> {
	const resolved: ConsentServerRouteOptions = options;
	const handle = createConsentRouteHandler({
		adapter: '@c15t/tanstack-start',
		backendURL: resolved.backendURL,
		cache: resolved.cache,
		fetch: resolved.fetch,
		fetchGvl: resolved.fetchGvl,
		manifest: resolved.manifest,
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
	const manifestGET: ConsentRouteHandler = (context) =>
		handle(context.request, contextFor(context, 'manifest'));
	const initGET: ConsentRouteHandler = (context) =>
		handle(context.request, contextFor(context, 'init'));
	const proxyHandler: ConsentRouteHandler = (context) =>
		handle(context.request, contextFor(context, 'proxy'));

	const handlers: ConsentServerRouteHandlers = { GET, initGET, manifestGET };
	if (!resolved.proxy) {
		return handlers as ConsentServerRouteHandlersFor<Options>;
	}
	const proxied: ConsentProxyRouteHandlers = {
		...handlers,
		DELETE: proxyHandler,
		OPTIONS: proxyHandler,
		PATCH: proxyHandler,
		POST: proxyHandler,
		PUT: proxyHandler,
		proxyHandler,
	};
	return proxied as ConsentServerRouteHandlersFor<Options>;
};
