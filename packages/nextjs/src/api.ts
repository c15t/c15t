import { c15tProtocolHeaders } from '@c15t/core';
import { createConsentRouteHandler } from '@c15t/core/server';
import type {
	ConsentProxyOptions,
	ConsentRouteFetchGvl,
	ConsentRouteName,
} from '@c15t/core/server';

import type { ConsentSourceOptions } from './consent-source';
import { resolveConsentSource } from './consent-source';

const DEFAULT_MANIFEST_REVALIDATE_SECONDS = 300;

type NextFetchInit = RequestInit & {
	next?: {
		revalidate?: number | false;
		tags?: string[];
	};
};

/**
 * Options for {@link createConsentRoute} and `createPagesConsentRoute`.
 * Everything defaults to `c15t.config.ts`.
 */
export interface NextConsentRouteOptions extends ConsentSourceOptions {
	/**
	 * Resolve a relative `backendURL` or `manifestURL` against the request's
	 * `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers instead
	 * of the request URL. Any client can send those headers, so set this
	 * only behind a proxy that sets them and drops incoming ones.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Next.js Data Cache lifetime for the manifest fetch, in seconds, or
	 * `false` to skip the Data Cache.
	 *
	 * @default 300
	 */
	manifestRevalidateSeconds?: number | false;

	fetch?: typeof globalThis.fetch;

	/**
	 * Receives the promise of detached work a request started (a background
	 * manifest revalidation, a session report, or the rest of a request
	 * whose client went away), so the host can keep it alive past the
	 * response on runtimes that stop detached work once a response is sent.
	 * Called inside the handler, so `after` from `next/server` (Next 15.1
	 * and later; 15.0 exposes it as `unstable_after`) can be used directly.
	 * The promise never rejects.
	 *
	 * @example
	 * ```ts
	 * import { after } from 'next/server';
	 *
	 * export const { GET } = createConsentRoute({
	 *   onBackgroundRevalidate: (refresh) => after(() => refresh),
	 * });
	 * ```
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
	 * Loads the Global Vendor List for IAB policies. Defaults to the shared
	 * server cache, with a deadline on the upstream request.
	 */
	fetchGvl?: ConsentRouteFetchGvl;

	/**
	 * Forward the other consent paths (`subjects`, `subjects/:id`, `health`,
	 * `status`) to the backend, so a browser `backendURL` of `/api/c15t`
	 * reaches the backend through this route instead of a rewrite. Without
	 * it, those paths answer 404. App Router only.
	 *
	 * @default false
	 */
	proxy?: boolean | ConsentProxyOptions;
}

/**
 * The upstream manifest request as the App Router sees it: JSON with the
 * c15t protocol headers, and a `next.revalidate` hint for the Data Cache.
 *
 * @param options - Handler options; reads `manifestRevalidateSeconds`.
 * @returns The `fetch` init for the manifest request.
 */
export const createManifestFetchInit = function createManifestFetchInit(
	options: Pick<NextConsentRouteOptions, 'manifestRevalidateSeconds'> = {}
): NextFetchInit {
	return {
		headers: { accept: 'application/json', ...c15tProtocolHeaders },
		method: 'GET',
		next: {
			revalidate:
				options.manifestRevalidateSeconds === false
					? 0
					: (options.manifestRevalidateSeconds ??
						DEFAULT_MANIFEST_REVALIDATE_SECONDS),
		},
	};
};

/**
 * The core handler for a set of Next.js options. Built on the first
 * request, so `c15t.config.ts` is read once every module has loaded.
 */
const createHandler = function createHandler(options: NextConsentRouteOptions) {
	// Two cache layers on purpose. `next.revalidate` reaches the App Router
	// Data Cache; the shared in-process cache covers the Pages Router and
	// any runtime without one, and adds ETag revalidation on top. The
	// in-process cache sends the headers itself, so only the hint goes.
	const { next } = createManifestFetchInit(options);
	let handler: ReturnType<typeof createConsentRouteHandler> | undefined;
	return function handle(
		...args: Parameters<ReturnType<typeof createConsentRouteHandler>>
	) {
		if (!handler) {
			const source = resolveConsentSource(options);
			handler = createConsentRouteHandler({
				adapter: '@c15t/nextjs',
				backendURL: source.backendURL,
				fetch: options.fetch,
				fetchGvl: options.fetchGvl,
				manifest: source.snapshot,
				manifestFetchInit: { next } as NextFetchInit,
				manifestURL: source.manifestURL,
				proxy: options.proxy,
				reportSessions: options.reportSessions,
				trustForwardedHeaders: options.trustForwardedHeaders,
			});
		}
		return handler(...args);
	};
};

/**
 * The second argument Next.js passes an App Router route handler. Only
 * `params` is read: a catch-all segment's value names the consent route.
 */
export interface NextRouteHandlerContext {
	params: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * An App Router route handler. The context matches Next.js 15 and later
 * exactly, because Next's route type check rejects anything looser.
 */
export type NextRouteHandler = (
	request: Request,
	context: NextRouteHandlerContext
) => Promise<Response>;

/** Handlers returned by {@link createConsentRoute}. */
export interface NextConsentRouteHandlers {
	/** Serves `manifest` and `init`; other paths answer 404. */
	GET: NextRouteHandler;
}

/** Handlers returned by {@link createConsentRoute} with `proxy` on. */
export interface NextConsentProxyRouteHandlers extends NextConsentRouteHandlers {
	POST: NextRouteHandler;
	PATCH: NextRouteHandler;
	PUT: NextRouteHandler;
	DELETE: NextRouteHandler;
	OPTIONS: NextRouteHandler;
}

/** Picks the handler set from the options' `proxy`. */
export type NextConsentRouteHandlersFor<Options> = Options extends {
	proxy: true | ConsentProxyOptions;
}
	? NextConsentProxyRouteHandlers
	: NextConsentRouteHandlers;

/**
 * The path below the route prefix, from the route's catch-all parameter
 * (`['manifest']` from `[...c15t]`, whatever the folder calls it). Without
 * one the route is a fixed mount and core reads the last URL segment.
 */
const readCatchAllPath = async function readCatchAllPath(
	context: Partial<NextRouteHandlerContext> | undefined
): Promise<string | undefined> {
	const params = await context?.params;
	if (!params) {
		return undefined;
	}
	for (const value of Object.values(params)) {
		if (Array.isArray(value)) {
			return value.join('/');
		}
	}
	return undefined;
};

/**
 * Build the handlers for one catch-all consent route,
 * `app/api/c15t/[...c15t]/route.ts`. `GET` serves `/manifest` and `/init`;
 * every other path answers 404 unless `proxy` forwards it to the backend.
 *
 * Set `routePrefix: '/api/c15t'` in `c15t.config.ts` so a browser that
 * resolves consent itself asks this route. Pages the root layout resolves
 * on the server don't need it. The manifest defaults to the snapshot
 * `withConsentManifest` downloaded, and the backend to the config's.
 *
 * @param options - Overrides of `c15t.config.ts`, caching, and `proxy`.
 * @returns `GET`, plus `POST`, `PATCH`, `PUT`, `DELETE` and `OPTIONS` when
 * `proxy` is on. A handler throws when it has no manifest, backend URL or
 * `manifestURL` to read.
 * @example
 * ```ts
 * // app/api/c15t/[...c15t]/route.ts
 * import { createConsentRoute } from 'c15t/next/api';
 *
 * export const { GET } = createConsentRoute();
 * ```
 */
export const createConsentRoute = function createConsentRoute<
	Options extends NextConsentRouteOptions = NextConsentRouteOptions,
>(options: Options = {} as Options): NextConsentRouteHandlersFor<Options> {
	const handle = createHandler(options);
	const waitUntil = options.onBackgroundRevalidate;
	const handlerFor = function handlerFor(
		route?: ConsentRouteName
	): NextRouteHandler {
		return async (request, context) =>
			handle(request, {
				path: await readCatchAllPath(context),
				route,
				waitUntil,
			});
	};
	const GET = handlerFor();
	if (!options.proxy) {
		return { GET } as NextConsentRouteHandlersFor<Options>;
	}
	const forward = handlerFor('proxy');
	const handlers: NextConsentProxyRouteHandlers = {
		DELETE: forward,
		GET,
		OPTIONS: forward,
		PATCH: forward,
		POST: forward,
		PUT: forward,
	};
	return handlers as NextConsentRouteHandlersFor<Options>;
};

export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';
