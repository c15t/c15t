/**
 * Same-origin consent routes for SvelteKit.
 *
 * Manifest mode (RFC 0001) moves policy resolution off the browser's critical
 * path: the host fetches one geo-independent, CDN-cacheable manifest and
 * resolves `/init` locally per request. The routes themselves live in
 * `@c15t/core/server` (`createConsentRouteHandler`), shared with the Next.js,
 * Nuxt, Astro and TanStack Start adapters; this module mounts them as
 * SvelteKit `RequestHandler`s. What it adds is SvelteKit's: the rest
 * parameter picks the route, `event.fetch` answers a relative backend
 * in-process, `event.getClientAddress()` and `event.url` vouch for the
 * proxy's hop chain, and `platform.context.waitUntil` keeps detached work
 * alive.
 */
import { createConsentRouteHandler, readWaitUntil } from '@c15t/core/server';
import type {
	ConsentProxyForwarding,
	ConsentProxyOptions,
	ConsentRouteFetchGvl,
	ConsentRouteName,
	ConsentRouteRequestContext,
} from '@c15t/core/server';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

import type { ConsentManifestOptions } from './types';

export type { ConsentProxyOptions } from '@c15t/core/server';

/**
 * Hands a promise to the `waitUntil` a SvelteKit adapter exposes on
 * `event.platform.context` (Netlify, and Cloudflare and Vercel edge on
 * SvelteKit 2), so a background refresh outlives the response on runtimes
 * that would cancel it. A no-op where the adapter provides none, which
 * includes SvelteKit 3's Cloudflare and Vercel adapters; apps there pass
 * the platform's `waitUntil` as `onBackgroundRevalidate`.
 */
export const waitUntilFromEvent = function waitUntilFromEvent(
	revalidation: Promise<void>,
	event: RequestEvent
): void {
	readWaitUntil(
		(event.platform as { context?: unknown } | undefined)?.context
	)?.(revalidation);
};

/** Removes surrounding slashes in linear time. */
const trimPathSlashes = function trimPathSlashes(value: string): string {
	let start = 0;
	let end = value.length;
	while (end > 0 && value[end - 1] === '/') {
		end -= 1;
	}
	while (start < end && value[start] === '/') {
		start += 1;
	}
	return value.slice(start, end);
};

const REST_PARAM = /\[\.\.\.(?<name>[^\]=]+)(?:=[^\]]+)?\]/u;

/**
 * The path below the route's rest parameter (`[...path]` in
 * `src/routes/api/c15t/[...path]/+server.ts`), or `undefined` when the route
 * has none.
 */
const readRestPath = function readRestPath(
	event: RequestEvent
): string | undefined {
	const name = REST_PARAM.exec(event.route?.id ?? '')?.groups?.name;
	const value = name ? event.params?.[name] : undefined;
	return value === undefined ? undefined : trimPathSlashes(value);
};

/**
 * The proxy's hop chain, from what SvelteKit derived from its own
 * configuration (`ADDRESS_HEADER`, `XFF_DEPTH`, `paths.origin` or
 * SvelteKit 2's `ORIGIN`), never from the request's forwarding headers.
 * Without a configured origin, adapter-node takes the host from the `Host`
 * header, so the forwarded host is only as trustworthy as that.
 */
const readForwarding = function readForwarding(
	event: RequestEvent
): ConsentProxyForwarding {
	let clientAddress: string | undefined;
	try {
		clientAddress = event.getClientAddress();
	} catch {
		// Some adapters and test harnesses cannot tell.
	}
	return {
		for: clientAddress,
		host: event.url.host,
		proto: event.url.protocol.replace(/:$/u, ''),
	};
};

/** Options for {@link createSvelteKitConsentRouteHandlers}. */
export interface SvelteKitConsentRouteOptions extends ConsentManifestOptions {
	/**
	 * Fetches the Global Vendor List when the resolved policy is IAB.
	 * Defaults to the shared server cache, with a deadline on the upstream
	 * request.
	 */
	fetchGvl?: ConsentRouteFetchGvl;
	/**
	 * Forward consent writes to `backendURL` through this route, so
	 * `hosted({ url: '/api/c15t' })` can save through the app's own origin.
	 * Without it the route answers `GET` only and a save gets `405`.
	 *
	 * When enabled the handlers gain `POST`, `PATCH`, `PUT`, `DELETE`, and
	 * `OPTIONS`, and `GET` forwards every path below the route's rest
	 * parameter other than `manifest` and `init`, which stay resolved
	 * in-process. Only an allowlist of paths is forwarded (`subjects`,
	 * `subjects/:id`, `init`, `manifest`, `health`, `status`, plus
	 * {@link ConsentProxyOptions.paths}); anything else is a 404, so the
	 * route is never an open proxy. Mount it as a catch-all route such as
	 * `src/routes/api/c15t/[...path]/+server.ts`.
	 *
	 * The proxy forwards the browser's identity headers (`user-agent`,
	 * `accept-language`, `origin`, `referer`, `sec-gpc`, the geo headers),
	 * cookies only when {@link ConsentProxyOptions.cookieNames} names them,
	 * and sets `x-forwarded-for` from `event.getClientAddress()`,
	 * `x-forwarded-host` and `x-forwarded-proto` from `event.url`, the c15t
	 * version header, and `x-c15t-proxy: @c15t/svelte`. The hosted backend
	 * sits behind a firewall that scores a bare server-to-server request as a
	 * bot; these give it the signals a direct browser request carries, and a
	 * stable key for a bypass rule. It needs `backendURL`, not a
	 * `manifestURL` alone. A path such as
	 * `/api/self-host` names a route in this app: requests to it go through
	 * `event.fetch`, which SvelteKit answers in-process, so the request's
	 * `Host` header never chooses where they go.
	 *
	 * @defaultValue false
	 */
	proxy?: boolean | ConsentProxyOptions;
}

/** Handlers returned by {@link createSvelteKitConsentRouteHandlers}. */
export interface SvelteKitConsentRouteHandlers {
	/** Serves `manifest` and `init` from one catch-all route. */
	GET: RequestHandler;
	/** Init resolver for a dedicated `/api/c15t/init` route. */
	init: RequestHandler;
	/** Manifest passthrough for a dedicated `/api/c15t/manifest` route. */
	manifest: RequestHandler;
}

/**
 * Handlers returned by {@link createSvelteKitConsentRouteHandlers} when
 * `proxy` is enabled: the in-process handlers plus one proxy handler per
 * write method.
 */
export interface SvelteKitConsentProxyRouteHandlers extends SvelteKitConsentRouteHandlers {
	POST: RequestHandler;
	PATCH: RequestHandler;
	PUT: RequestHandler;
	DELETE: RequestHandler;
	OPTIONS: RequestHandler;
	/**
	 * The bare proxy handler, for a route file mounted at one fixed path
	 * (`api/c15t/subjects/+server.ts`). Applies the same path allowlist and
	 * header shaping.
	 */
	proxy: RequestHandler;
}

/**
 * Picks the handler shape from the options: the proxy handlers when
 * `proxy` is set to anything truthy, the plain handlers otherwise.
 */
export type SvelteKitConsentRouteHandlersFor<
	Options extends SvelteKitConsentRouteOptions,
> = Options extends { proxy: true | ConsentProxyOptions }
	? SvelteKitConsentProxyRouteHandlers
	: SvelteKitConsentRouteHandlers;

/**
 * Creates the SvelteKit request handlers for manifest mode.
 *
 * Two shapes are supported. A single catch-all route:
 *
 * ```ts
 * // src/routes/api/c15t/[...path]/+server.ts
 * import { createSvelteKitConsentRouteHandlers } from '@c15t/svelte/kit';
 *
 * export const { GET } = createSvelteKitConsentRouteHandlers({
 *   backendURL: 'https://your-project.inth.app',
 * });
 * ```
 *
 * …or one file per route, using `init` and `manifest` directly.
 *
 * With `proxy: true` the catch-all route also forwards consent writes to the
 * backend, so the browser only talks to this origin:
 *
 * ```ts
 * export const { GET, POST, PATCH, PUT, DELETE, OPTIONS } =
 *   createSvelteKitConsentRouteHandlers({
 *     backendURL: 'https://your-project.inth.app',
 *     proxy: true, // then hosted({ url: '/api/c15t' })
 *   });
 * ```
 *
 * @param routeOptions - Manifest source (`backendURL` or `manifestURL`),
 * fetch implementation, GVL fetcher, proxy.
 * @returns `init`, `manifest`, and a `GET` that dispatches between them. With
 * `proxy` on, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`, and `proxy` join.
 * Each handler throws when neither `backendURL` nor `manifestURL` is set.
 */
export const createSvelteKitConsentRouteHandlers =
	function createSvelteKitConsentRouteHandlers<
		Options extends SvelteKitConsentRouteOptions = SvelteKitConsentRouteOptions,
	>(routeOptions: Options): SvelteKitConsentRouteHandlersFor<Options> {
		const options: SvelteKitConsentRouteOptions = routeOptions;
		const handle = createConsentRouteHandler({
			adapter: '@c15t/svelte',
			backendURL: options.backendURL,
			fetch: options.fetch,
			fetchGvl: options.fetchGvl,
			manifestURL: options.manifestURL,
			proxy: options.proxy,
			reportSessions: options.reportSessions,
		});

		const contextFor = function contextFor(
			event: RequestEvent,
			route?: ConsentRouteName
		): ConsentRouteRequestContext {
			const onBackgroundRevalidate =
				options.onBackgroundRevalidate ?? waitUntilFromEvent;
			return {
				forwarding: () => readForwarding(event),
				// A relative backend such as `/api/self-host` is a route in this
				// app: SvelteKit answers it in-process, so the request's `Host`
				// never chooses where it goes.
				localFetch: event.fetch,
				path: readRestPath(event),
				route,
				waitUntil: (task) => onBackgroundRevalidate(task, event),
			};
		};

		const GET: RequestHandler = (event) =>
			handle(event.request, contextFor(event));
		const init: RequestHandler = (event) =>
			handle(event.request, contextFor(event, 'init'));
		const manifest: RequestHandler = (event) =>
			handle(event.request, contextFor(event, 'manifest'));
		const proxy: RequestHandler = (event) =>
			handle(event.request, contextFor(event, 'proxy'));

		const handlers: SvelteKitConsentRouteHandlers = { GET, init, manifest };
		if (!options.proxy) {
			return handlers as SvelteKitConsentRouteHandlersFor<Options>;
		}
		const proxied: SvelteKitConsentProxyRouteHandlers = {
			...handlers,
			DELETE: proxy,
			OPTIONS: proxy,
			PATCH: proxy,
			POST: proxy,
			PUT: proxy,
			proxy,
		};
		return proxied as SvelteKitConsentRouteHandlersFor<Options>;
	};
