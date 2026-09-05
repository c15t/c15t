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
 *   server: { handlers: createConsentServerRoute() },
 * });
 * ```
 *
 * - `GET /api/c15t/manifest` passes the cached backend manifest through
 *   with its cache headers, so browsers and CDNs can cache it.
 * - `GET /api/c15t/init` resolves init in-process from that manifest for
 *   the request's geo, language, and GPC signal. `ConsentBoundary` points
 *   `initURL` here by default; a client language switch re-hits it.
 *
 * By default `POST /subjects` is not proxied: consent saves go straight to
 * `backendURL`, which mirrors the Next.js and Nuxt adapters. Pass
 * `proxy: true` to forward the remaining consent paths through the same
 * route so `ConsentBoundary` can use `backendURL="/api/c15t"`; see
 * {@link ConsentServerRouteOptions.proxy}.
 */

import {
	fetchCachedManifest,
	getManifestAge,
	MANIFEST_PASSTHROUGH_HEADERS,
	resolveManifestInit,
	resolveManifestSourceURL,
} from '@c15t/core/transports/manifest-cache';
import type { ManifestCache } from '@c15t/core/transports/manifest-cache';
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';

import { filterCookieHeader } from './libs/cookies';
import {
	FORWARDING_HEADERS,
	proxyConsentRequest,
	resolveProxyOptions,
} from './libs/proxy';
import type { ConsentProxyOptions } from './libs/proxy';
import { readConsentInputs } from './libs/request-inputs';
import { resolveRequestURL } from './libs/request-url';

export type { ConsentProxyOptions } from './libs/proxy';

const INIT_CACHE_CONTROL = 'private, no-store';

/** Options for {@link createConsentServerRoute}. */
export interface ConsentServerRouteOptions {
	/**
	 * Backend base URL that serves `/manifest`, for example
	 * `https://consent.example.com`. Defaults to the `C15T_BACKEND_URL`
	 * environment variable, then `VITE_C15T_BACKEND_URL`.
	 */
	backendURL?: string;

	/**
	 * Full manifest URL. Overrides `${backendURL}/manifest`. Defaults to
	 * the `C15T_MANIFEST_URL` environment variable.
	 */
	manifestURL?: string;

	/**
	 * Fetch implementation for manifest and GVL requests. Defaults to
	 * `globalThis.fetch`.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Custom Global Vendor List fetcher. Called only when the manifest
	 * enables IAB and the resolved policy is the IAB model.
	 */
	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: typeof globalThis.fetch;
	}) => Promise<GlobalVendorList | null>;

	/**
	 * Manifest cache to read through. Defaults to the module-level cache
	 * shared with `prefetchInitialConsent()`.
	 */
	cache?: ManifestCache;

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
	 * browser only ever talks to the app's own origin and `ConsentBoundary`
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
	 * Server-side `prefetchInitialConsent` must still receive the absolute
	 * backend URL: its self-route guard skips a relative `/api/c15t`.
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

type EnvRecord = Record<string, string | undefined>;

/**
 * Reads an environment variable without assuming Node globals exist:
 * `process.env` on Node and Vercel, then Vite's `import.meta.env` for
 * `VITE_*` variables on other hosts.
 */
const getEnv = function getEnv(name: string): string | undefined {
	const processEnv = (globalThis as { process?: { env?: EnvRecord } }).process
		?.env;
	if (processEnv?.[name]) {
		return processEnv[name];
	}
	const metaEnv = (import.meta as { env?: EnvRecord }).env;
	return metaEnv?.[name] || undefined;
};

const resolveBackendURL = function resolveBackendURL(
	request: Request,
	options: ConsentServerRouteOptions
): string {
	const backendURL =
		options.backendURL ??
		getEnv('C15T_BACKEND_URL') ??
		getEnv('VITE_C15T_BACKEND_URL');
	if (!backendURL) {
		throw new Error(
			'@c15t/tanstack-start/api: configure backendURL, C15T_BACKEND_URL, or C15T_MANIFEST_URL.'
		);
	}
	const resolved = resolveRequestURL(
		backendURL,
		request,
		options.trustForwardedHeaders ?? false
	);
	if (!resolved) {
		throw new Error('@c15t/tanstack-start/api: invalid backendURL.');
	}
	return resolved;
};

const resolveSourceURL = function resolveSourceURL(
	request: Request,
	options: ConsentServerRouteOptions
): string {
	const manifestURL = options.manifestURL ?? getEnv('C15T_MANIFEST_URL');
	if (manifestURL) {
		const resolved = resolveRequestURL(
			manifestURL,
			request,
			options.trustForwardedHeaders ?? false
		);
		if (!resolved) {
			throw new Error('@c15t/tanstack-start/api: invalid manifestURL.');
		}
		return resolved;
	}
	return resolveManifestSourceURL({
		backendURL: resolveBackendURL(request, options),
	});
};

/** A conservative BCP 47 shape: primary subtag plus up to two subtags. */
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,2}$/u;

/**
 * Canonical `?language` for the upstream manifest request. The value keys
 * the shared manifest cache, so anything that is not a plausible language
 * tag is dropped rather than allowed to mint an unbounded set of entries.
 */
const readLanguageQuery = function readLanguageQuery(
	request: Request
): string | undefined {
	const raw = new URL(request.url).searchParams.get('language');
	if (!raw) {
		return undefined;
	}
	const language = raw.trim().toLowerCase();
	return LANGUAGE_TAG.test(language) ? `language=${language}` : undefined;
};

const shouldFetchGvl = function shouldFetchGvl(
	manifest: ConsentManifest,
	payload: InitOutput
) {
	return (
		manifest.iab?.enabled === true &&
		manifest.iab.gvl !== undefined &&
		(manifest.policyPacks === undefined || payload.policy?.model === 'iab')
	);
};

const defaultFetchGvl = async function defaultFetchGvl(input: {
	reference: ConsentManifestGVLReference;
	language: string;
	fetch: typeof globalThis.fetch;
}): Promise<GlobalVendorList | null> {
	const response = await input.fetch(input.reference.url, {
		headers: {
			'accept-language': input.language,
		},
		method: 'GET',
	});
	if (response.status === 204) {
		return null;
	}
	if (!response.ok) {
		throw new Error(
			`@c15t/tanstack-start/api: GVL responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as GlobalVendorList;
};

/**
 * The splat below the route prefix. Prefers the router's `_splat` param;
 * without one (tests, custom mounts) it takes the last path segment, which
 * is enough for `manifest` and `init`.
 */
const readSplat = function readSplat(
	context: ConsentRouteHandlerContext
): string {
	const splat = context.params?._splat;
	if (splat !== undefined) {
		return splat.replace(/^\/+|\/+$/gu, '');
	}
	const { pathname } = new URL(context.request.url);
	return pathname.replace(/\/+$/u, '').split('/').pop() ?? '';
};

/**
 * Creates the same-origin consent route handlers.
 *
 * @param options - Backend location, fetch, GVL, cache, and proxy options.
 * @returns Handlers for `createFileRoute('/api/c15t/$')({ server: { handlers } })`.
 * With `proxy` off the set is `GET`, `manifestGET`, and `initGET`; with it
 * on, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`, and `proxyHandler` join.
 * @example
 * ```ts
 * export const Route = createFileRoute('/api/c15t/$')({
 *   server: {
 *     handlers: createConsentServerRoute({
 *       backendURL: 'https://consent.example.com',
 *       proxy: true, // then <ConsentBoundary backendURL="/api/c15t" />
 *     }),
 *   },
 * });
 * ```
 */
export const createConsentServerRoute = function createConsentServerRoute<
	Options extends ConsentServerRouteOptions = ConsentServerRouteOptions,
>(options?: Options): ConsentServerRouteHandlersFor<Options> {
	const resolved: ConsentServerRouteOptions = options ?? {};
	const proxyOptions = resolveProxyOptions(
		resolved.proxy,
		resolved.trustForwardedHeaders ?? false
	);

	/**
	 * Credentials for the manifest fetch behind the intercepted `manifest`
	 * and `init` routes: the cookies `proxy.cookieNames` names and the extra
	 * `proxy.forwardHeaders`, so a backend that gates `/manifest` on them
	 * still serves it. The manifest cache partitions by these headers, so keep
	 * them tenant-level rather than per visitor.
	 */
	const manifestRequestHeaders = function manifestRequestHeaders(
		request: Request
	): Record<string, string> | undefined {
		if (!proxyOptions) {
			return undefined;
		}
		const headers: Record<string, string> = {};
		const cookie = request.headers.get('cookie');
		const scoped =
			cookie && proxyOptions.cookieNames
				? filterCookieHeader(cookie, proxyOptions.cookieNames)
				: undefined;
		if (scoped) {
			headers.cookie = scoped;
		}
		const extras =
			typeof resolved.proxy === 'object'
				? (resolved.proxy.forwardHeaders ?? [])
				: [];
		for (const name of extras) {
			const lower = name.toLowerCase();
			// Hop-chain headers are never copied from the browser; the manifest
			// fetch carries no trusted branch to rebuild them from.
			if (lower === 'cookie' || FORWARDING_HEADERS.has(lower)) {
				continue;
			}
			const value = request.headers.get(lower);
			if (value) {
				headers[lower] = value;
			}
		}
		return Object.keys(headers).length > 0 ? headers : undefined;
	};

	const manifestGET: ConsentRouteHandler = async ({ request }) => {
		const credentials = manifestRequestHeaders(request);
		const cached = await fetchCachedManifest({
			cache: resolved.cache,
			fetch: resolved.fetch,
			headers: credentials,
			query: readLanguageQuery(request),
			sourceURL: resolveSourceURL(request, resolved),
		});

		const headers = new Headers({ 'content-type': 'application/json' });
		for (const name of MANIFEST_PASSTHROUGH_HEADERS) {
			const value = cached.headers[name];
			if (value) {
				headers.set(name, value);
			}
		}
		if (credentials) {
			// The in-process cache is partitioned by these credentials; a shared
			// cache in front of this route is keyed by URL only, so it must not
			// reuse a credentialed manifest for the next visitor.
			headers.set('cache-control', 'private, no-store');
			headers.delete('etag');
			headers.delete('last-modified');
		} else {
			// Downstream caches count the remaining lifetime, not a fresh TTL.
			headers.set('age', String(getManifestAge(cached)));
		}

		const { etag } = cached.headers;
		if (etag && request.headers.get('if-none-match') === etag) {
			return new Response(null, { headers, status: 304 });
		}
		return new Response(JSON.stringify(cached.manifest), {
			headers,
			status: 200,
		});
	};

	const initGET: ConsentRouteHandler = async ({ request }) => {
		const cached = await fetchCachedManifest({
			cache: resolved.cache,
			fetch: resolved.fetch,
			headers: manifestRequestHeaders(request),
			sourceURL: resolveSourceURL(request, resolved),
		});
		const remembered = readConsentInputs(request);
		const payload = resolveManifestInit(
			remembered
				? {
						inputs: { ...remembered, language: remembered.language ?? 'en' },
						manifest: cached.manifest,
					}
				: { headers: request.headers, manifest: cached.manifest }
		);

		if (shouldFetchGvl(cached.manifest, payload) && cached.manifest.iab?.gvl) {
			const language = payload.translations.language.split('-')[0] || 'en';
			payload.gvl = await (resolved.fetchGvl ?? defaultFetchGvl)({
				fetch: resolved.fetch ?? globalThis.fetch.bind(globalThis),
				language,
				reference: cached.manifest.iab.gvl,
			});
		}

		return Response.json(payload, {
			headers: { 'cache-control': INIT_CACHE_CONTROL },
		});
	};

	const notFound = () =>
		Promise.resolve(Response.json({ error: 'Not found' }, { status: 404 }));

	const proxyHandler: ConsentRouteHandler = (context) =>
		proxyOptions
			? proxyConsentRequest({
					backendURL: resolveBackendURL(context.request, resolved),
					fetch: resolved.fetch,
					options: proxyOptions,
					path: readSplat(context),
					request: context.request,
				})
			: notFound();

	const GET: ConsentRouteHandler = (context) => {
		switch (readSplat(context)) {
			case 'manifest':
				return manifestGET(context);
			case 'init':
				return initGET(context);
			default:
				return proxyHandler(context);
		}
	};

	const handlers: ConsentServerRouteHandlers = { GET, initGET, manifestGET };
	if (!proxyOptions) {
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

const defaultHandlers = createConsentServerRoute();

/** Splat handler configured from environment variables. */
export const { GET } = defaultHandlers;
/** Manifest handler configured from environment variables. */
export const { manifestGET } = defaultHandlers;
/** Init handler configured from environment variables. */
export const { initGET } = defaultHandlers;
