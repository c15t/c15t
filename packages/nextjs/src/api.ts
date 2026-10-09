import { c15tProtocolHeaders } from '@c15t/core';
import { createConsentRouteHandler } from '@c15t/core/server';
import type {
	ConsentProxyOptions,
	ConsentRouteFetchGvl,
	ConsentRouteName,
} from '@c15t/core/server';
import { snapshot as generatedManifest } from '@c15t/nextjs/generated-manifest';
import type { ConsentManifest } from '@c15t/schema/types';

import type { ConsentConfig } from './config';
import { isConsentConfig } from './config';

const DEFAULT_MANIFEST_REVALIDATE_SECONDS = 300;

type NextFetchInit = RequestInit & {
	next?: {
		revalidate?: number | false;
		tags?: string[];
	};
};

export interface NextConsentManifestHandlersOptions {
	/**
	 * Backend base URL that serves `/manifest`, for example
	 * `https://your-project.inth.app`. Pass this or `manifestURL`.
	 */
	backendURL?: string;

	/**
	 * Full manifest URL. Overrides `backendURL + "/manifest"`. Pass this or
	 * `backendURL`.
	 */
	manifestURL?: string;
	/**
	 * Deployment-bound manifest. Takes precedence over upstream URLs.
	 * Defaults to the snapshot `withConsentManifest` generated, unless
	 * `manifestURL` is set. `undefined`, which a build that could not fetch
	 * the manifest generates, makes the server fetch the policy at runtime.
	 */
	manifest?: ConsentManifest | undefined;

	/**
	 * A `defineConsentConfig` result. Its `backendURL` and an absolute
	 * `manifestURL` are read, as `resolveConsent` reads them; explicit options
	 * win. A `/`-relative `manifestURL` and `initURL` name the routes these
	 * handlers serve, so they are never fetched.
	 */
	config?: ConsentConfig;

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
	 * createNextConsentRouteHandlers({
	 *   ...consentConfig,
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
}

/**
 * The upstream manifest request as the App Router sees it: JSON with the
 * c15t protocol headers, and a `next.revalidate` hint for the Data Cache.
 *
 * @param options - Handler options; reads `manifestRevalidateSeconds`.
 * @returns The `fetch` init for the manifest request.
 */
export const createManifestFetchInit = function createManifestFetchInit(
	options: NextConsentManifestHandlersOptions = {}
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
 * A config's `manifestURL` when it points upstream. A `/`-relative one is
 * the route these handlers serve.
 */
const upstreamManifestURL = (config: ConsentConfig | undefined) =>
	config?.manifestURL?.startsWith('/') ? undefined : config?.manifestURL;

/**
 * Handler options from either the explicit options bag or a
 * `defineConsentConfig` result.
 *
 * A config's `routePrefix`, `manifestURL` and `initURL` name the same-origin
 * routes these handlers serve, so only `backendURL` carries over;
 * forwarding `manifestURL` would make the manifest route fetch itself.
 */
const toHandlerOptions = function toHandlerOptions(
	options: NextConsentManifestHandlersOptions | ConsentConfig
): NextConsentManifestHandlersOptions {
	if (!isConsentConfig(options)) {
		return options;
	}
	// A spread config keeps its brand, and may carry handler options too.
	const { initURL, manifestURL, routePrefix, ...rest } =
		options as ConsentConfig & NextConsentManifestHandlersOptions;
	void initURL;
	void manifestURL;
	void routePrefix;
	return rest;
};

/**
 * The core handler for a set of Next.js options, with the generated
 * snapshot as the default manifest when no upstream `manifestURL` is set.
 */
const createHandler = function createHandler(
	options: NextConsentManifestHandlersOptions,
	proxy?: boolean | ConsentProxyOptions
) {
	// Two cache layers on purpose. `next.revalidate` reaches the App Router
	// Data Cache; the shared in-process cache covers the Pages Router and
	// any runtime without one, and adds ETag revalidation on top. The
	// in-process cache sends the headers itself, so only the hint goes.
	const { next } = createManifestFetchInit(options);
	const manifestURL =
		options.manifestURL ?? upstreamManifestURL(options.config);
	return createConsentRouteHandler({
		adapter: '@c15t/nextjs',
		backendURL: options.backendURL ?? options.config?.backendURL,
		fetch: options.fetch,
		fetchGvl: options.fetchGvl,
		manifest:
			options.manifest ??
			(manifestURL === undefined ? generatedManifest : undefined),
		manifestFetchInit: { next } as NextFetchInit,
		manifestURL,
		proxy,
		reportSessions: options.reportSessions,
		trustForwardedHeaders: options.trustForwardedHeaders,
	});
};

/**
 * Build the App Router route handlers for the consent routes.
 *
 * @param optionsOrConfig - Handler options with `backendURL`, `config` or
 * `manifestURL`, or a `defineConsentConfig` result. From a config only
 * `backendURL` is used: its `manifestURL` and `initURL` are the routes these
 * handlers serve. Accepts the same `ConsentManifestOptions` object as
 * `resolveConsent`.
 * @returns `GET` for the init route and `manifestGET` for the manifest route.
 * Each handler throws when no `manifest`, backend URL or `manifestURL` is set.
 * @example
 * ```ts
 * // app/api/consent/manifest/route.ts
 * import { createNextConsentRouteHandlers } from '@c15t/nextjs/api';
 * import { consentConfig } from '@/consent.config';
 *
 * export const { manifestGET: GET } =
 *   createNextConsentRouteHandlers(consentConfig);
 * ```
 */
export const createNextConsentRouteHandlers =
	function createNextConsentRouteHandlers(
		optionsOrConfig: NextConsentManifestHandlersOptions | ConsentConfig
	) {
		const options = toHandlerOptions(optionsOrConfig);
		const handle = createHandler(options);
		const waitUntil = options.onBackgroundRevalidate;
		return {
			GET(request: Request): Promise<Response> {
				return handle(request, { route: 'init', waitUntil });
			},
			manifestGET(request: Request): Promise<Response> {
				return handle(request, { route: 'manifest', waitUntil });
			},
		};
	};

/** Options for {@link createConsentRoute}. */
export interface NextConsentRouteOptions extends NextConsentManifestHandlersOptions {
	/**
	 * Forward the other consent paths (`subjects`, `subjects/:id`, `health`,
	 * `status`) to `backendURL`, so a browser `backendURL` of `/api/c15t`
	 * reaches the backend through this route instead of a rewrite. Without
	 * it, those paths answer 404.
	 *
	 * @default false
	 */
	proxy?: boolean | ConsentProxyOptions;
}

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
 * Pair it with `defineConsentConfig({ routePrefix: '/api/c15t' })`, which
 * points the browser and `resolveConsent` at the same two paths. The
 * manifest defaults to the snapshot `withConsentManifest` generated.
 *
 * @param optionsOrConfig - A `defineConsentConfig` result, or handler
 * options. From a config only `backendURL` is used.
 * @returns `GET`, plus `POST`, `PATCH`, `PUT`, `DELETE` and `OPTIONS` when
 * `proxy` is on. A handler throws when it has no manifest, backend URL or
 * `manifestURL` to read.
 * @example
 * ```ts
 * // app/api/c15t/[...c15t]/route.ts
 * import { createConsentRoute } from '@c15t/nextjs/api';
 * import { consentConfig } from '@/c15t.config';
 *
 * export const { GET } = createConsentRoute(consentConfig);
 * ```
 */
export const createConsentRoute = function createConsentRoute<
	Options extends NextConsentRouteOptions | ConsentConfig =
		| NextConsentRouteOptions
		| ConsentConfig,
>(optionsOrConfig: Options): NextConsentRouteHandlersFor<Options> {
	const options = toHandlerOptions(optionsOrConfig);
	const { proxy } = optionsOrConfig as NextConsentRouteOptions;
	const handle = createHandler(options, proxy);
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
	if (!proxy) {
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
export type { ConsentManifestOptions } from './server';
