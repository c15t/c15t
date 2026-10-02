import { deferInitGvlToRoute, serveGvlReference } from '@c15t/core';
/**
 * Same-origin consent routes for SvelteKit.
 *
 * Manifest mode (RFC 0001) moves policy resolution off the browser's critical
 * path: the host fetches one geo-independent, CDN-cacheable manifest and
 * resolves `/init` locally per request. These handlers are the SvelteKit
 * server piece — the same contract `createNextConsentRouteHandlers` and the
 * Nuxt route factories implement.
 *
 * Cache discipline:
 * - The manifest route forwards the backend's `Cache-Control`/`ETag`
 *   verbatim and answers `If-None-Match` with `304`. The edge caches it; this
 *   process only dedupes bursts (see `@c15t/core/server`).
 * - The init route is per-request (geo, language, GPC) and therefore
 *   `private, no-store`.
 */
import {
	fetchCachedManifest,
	getManifestAge,
	MANIFEST_PASSTHROUGH_HEADERS,
	reportConsentSession,
	resolveRequestBackendURL,
	resolveSessionReportBackendURL,
} from '@c15t/core/server';
import type { ManifestFetch } from '@c15t/core/server';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
	resolveInitFromManifest,
} from '@c15t/schema/types';
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	GlobalVendorList,
	InitOutput,
} from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

import {
	proxyConsentRequest,
	readRestPath,
	resolveProxyOptions,
} from './proxy';
import type { ConsentProxyOptions } from './proxy';
import type { ConsentManifestOptions } from './types';

export type { ConsentProxyOptions } from './proxy';

const INIT_CACHE_CONTROL = 'private, no-store';
const MANIFEST_ROUTE_SUFFIX = '/manifest';

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
	const context = (
		event.platform as { context?: { waitUntil?: unknown } } | undefined
	)?.context;
	if (context && typeof context.waitUntil === 'function') {
		(context.waitUntil as (promise: Promise<unknown>) => void).call(
			context,
			revalidation
		);
	}
};

const bindBackgroundRevalidate = function bindBackgroundRevalidate(
	options: ConsentManifestOptions,
	event: RequestEvent
): (revalidation: Promise<void>) => void {
	const onBackgroundRevalidate =
		options.onBackgroundRevalidate ?? waitUntilFromEvent;
	return (revalidation) => onBackgroundRevalidate(revalidation, event);
};

/**
 * Runs `handle` and, if the request is aborted before it finishes, hands the
 * rest of its work to the platform. `loadConsent` aborts its in-process call
 * when the render budget runs out; SvelteKit then stops waiting for the
 * route, and edge runtimes would drop a cold manifest fill the next render
 * needs.
 */
const keepAliveOnAbort = async function keepAliveOnAbort(
	options: ConsentManifestOptions,
	event: RequestEvent,
	handle: () => Promise<Response>
): Promise<Response> {
	const work = handle();
	const { signal } = event.request;
	const onAbort = () => {
		const remaining = (async () => {
			try {
				await work;
			} catch {
				// Nobody is waiting for this response any more.
			}
		})();
		try {
			bindBackgroundRevalidate(options, event)(remaining);
		} catch {
			// Registration is best effort; the work runs either way.
		}
	};
	signal.addEventListener('abort', onAbort, { once: true });
	try {
		return await work;
	} finally {
		signal.removeEventListener('abort', onAbort);
	}
};

/** Options for {@link createSvelteKitConsentRouteHandlers}. */
export interface SvelteKitConsentRouteOptions extends ConsentManifestOptions {
	/**
	 * Fetches the Global Vendor List when the resolved policy is IAB.
	 * Defaults to a plain `GET` of the manifest's GVL reference.
	 */
	fetchGvl?: (input: {
		reference: ConsentManifestGVLReference;
		language: string;
		fetch: typeof globalThis.fetch;
	}) => Promise<GlobalVendorList | null>;
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
 * Origin a relative `backendURL` or `manifestURL` is resolved against. It is
 * never contacted: a request to it goes to `event.fetch` as a path, which
 * SvelteKit answers in-process. Resolving against `event.url` instead would
 * let the client choose the host, because on adapter-node without
 * `paths.origin` (`ORIGIN` in SvelteKit 2) `event.url` takes its host from
 * the request's `Host` header. Loopback, so
 * the proxy's cleartext rules treat the in-process hop as local.
 */
const IN_PROCESS_ORIGIN = 'http://localhost';

/** A configured URL and the fetch that reaches it. */
interface ResolvedTarget {
	url: string;
	fetch: ManifestFetch | undefined;
}

/**
 * Sends requests for {@link IN_PROCESS_ORIGIN} URLs to `event.fetch` as
 * paths, so they stay inside this app.
 */
const inProcessFetch = function inProcessFetch(
	event: RequestEvent
): ManifestFetch {
	return (input, init) => {
		const url = new URL(input instanceof Request ? input.url : input);
		return event.fetch(`${url.pathname}${url.search}`, init);
	};
};

/**
 * Resolves a configured URL. An absolute `http(s)` URL is used as is with
 * the configured `fetch`. A path such as `/api/self-host` names a route in
 * this app and is fetched through `event.fetch`; the request's host never
 * becomes part of the target.
 */
const resolveTarget = function resolveTarget(
	url: string,
	event: RequestEvent,
	options: SvelteKitConsentRouteOptions
): ResolvedTarget | null {
	if (url.startsWith('/')) {
		const resolved = resolveRequestBackendURL(url, {
			requestURL: new URL(IN_PROCESS_ORIGIN),
		});
		return resolved ? { fetch: inProcessFetch(event), url: resolved } : null;
	}
	const resolved = resolveRequestBackendURL(url);
	return resolved ? { fetch: options.fetch, url: resolved } : null;
};

/**
 * Resolves where the manifest lives for this request: `manifestURL` when
 * set, otherwise `${backendURL}/manifest`.
 */
const resolveManifestSource = function resolveManifestSource(
	event: RequestEvent,
	options: SvelteKitConsentRouteOptions
): { manifestURL: string; fetch: ManifestFetch | undefined } {
	const { manifestURL } = options;
	if (manifestURL) {
		const resolved = resolveTarget(manifestURL, event, options);
		if (!resolved) {
			throw new Error('@c15t/svelte/kit: invalid manifest URL.');
		}
		return { fetch: resolved.fetch, manifestURL: resolved.url };
	}

	const { backendURL } = options;
	if (!backendURL) {
		throw new Error('@c15t/svelte/kit: pass backendURL or manifestURL.');
	}
	const resolved = resolveTarget(backendURL, event, options);
	if (!resolved) {
		throw new Error('@c15t/svelte/kit: invalid backend URL.');
	}
	return {
		fetch: resolved.fetch,
		manifestURL: `${resolved.url}${MANIFEST_ROUTE_SUFFIX}`,
	};
};

/**
 * The backend the proxy forwards to. A `manifestURL` alone names no backend
 * to save to.
 */
const resolveProxyBackend = function resolveProxyBackend(
	event: RequestEvent,
	options: SvelteKitConsentRouteOptions
): ResolvedTarget {
	const { backendURL } = options;
	if (!backendURL) {
		throw new Error('@c15t/svelte/kit: pass backendURL to use proxy.');
	}
	const resolved = resolveTarget(backendURL, event, options);
	if (!resolved) {
		throw new Error('@c15t/svelte/kit: invalid backend URL.');
	}
	return resolved;
};

/**
 * Where the init route reports sessions, when it can: an absolute backend,
 * read as configured rather than resolved against the request. A relative
 * backend resolved to this app's origin is its own route, not a backend,
 * and means no report; nothing is inferred from a manifest URL.
 */
const resolveReportBackendURL = function resolveReportBackendURL(
	options: SvelteKitConsentRouteOptions
): string | undefined {
	return resolveSessionReportBackendURL({
		backendURL: options.backendURL,
	});
};

const shouldFetchGvl = function shouldFetchGvl(
	manifest: ConsentManifest,
	payload: InitOutput
): boolean {
	return (
		manifest.iab?.enabled === true &&
		manifest.iab.gvl !== undefined &&
		payload.policyResolution?.status === 'matched' &&
		payload.policyResolution.policy.model === 'iab'
	);
};

const defaultFetchGvl = async function defaultFetchGvl(input: {
	reference: ConsentManifestGVLReference;
	language: string;
	fetch: typeof globalThis.fetch;
}): Promise<GlobalVendorList | null> {
	const response = await input.fetch(input.reference.url, {
		headers: { 'accept-language': input.language },
		method: 'GET',
	});
	if (response.status === 204) {
		return null;
	}
	if (!response.ok) {
		throw new Error(
			`@c15t/svelte/kit: GVL responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as GlobalVendorList;
};

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
		const proxyOptions = resolveProxyOptions(options.proxy);
		const resolveInit = async (event: RequestEvent): Promise<Response> => {
			const source = resolveManifestSource(event, options);
			const { manifest } = await fetchCachedManifest({
				config: { manifestURL: source.manifestURL },
				fetch: source.fetch,
				onBackgroundRevalidate: bindBackgroundRevalidate(options, event),
			});

			const listResponse = await serveGvlReference(event.request, (language) =>
				manifest.iab?.gvl
					? (options.fetchGvl ?? defaultFetchGvl)({
							fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
							language,
							reference: manifest.iab.gvl,
						})
					: Promise.resolve(null)
			);
			if (listResponse) {
				return listResponse;
			}
			const inputs = extractConsentRequestInputs(event.request.headers);
			const payload = resolveInitFromManifest(
				manifest,
				{
					country: inputs.country,
					gpc: inputs.gpc,
					language: inputs.language ?? 'en',
					region: inputs.region,
				},
				{ baseTranslations }
			) as InitOutput & { resolvedOverrides?: Record<string, unknown> };

			if (shouldFetchGvl(manifest, payload) && manifest.iab?.gvl) {
				const language = payload.translations.language.split('-')[0] || 'en';
				payload.gvl = await (options.fetchGvl ?? defaultFetchGvl)({
					fetch: (options.fetch ??
						globalThis.fetch.bind(globalThis)) as typeof globalThis.fetch,
					language,
					reference: manifest.iab.gvl,
				});
			}

			// An aborted request is a render that stopped waiting for this
			// answer; the browser inits again and that request reports the view.
			if (options.reportSessions !== false && !event.request.signal.aborted) {
				reportConsentSession({
					adapter: '@c15t/svelte',
					backendURL: resolveReportBackendURL(options),
					fetch: options.fetch as typeof globalThis.fetch | undefined,
					headers: event.request.headers,
					init: payload,
					inputs,
					manifest,
					method: event.request.method,
					source: 'route',
					waitUntil: bindBackgroundRevalidate(options, event),
				});
			}

			// The resolver's inputs are the only place GPC survives on the SSR
			// path — the browser never sends `Sec-GPC` to this route when the
			// page was server-rendered. Echo them back so the kernel folds the
			// same overrides it would have derived client-side.
			payload.resolvedOverrides = consentInputsToOverrides({
				country: inputs.country,
				language: inputs.language,
				region: inputs.region,
			});
			payload.resolvedPrivacySignals = { gpc: inputs.gpc };

			return Response.json(
				deferInitGvlToRoute(payload, new URL(event.request.url).pathname),
				{
					headers: { 'cache-control': INIT_CACHE_CONTROL },
				}
			);
		};

		const init: RequestHandler = (event) =>
			keepAliveOnAbort(options, event, () => resolveInit(event));

		const manifest: RequestHandler = async (event) => {
			const source = resolveManifestSource(event, options);
			const query = event.url.searchParams.toString();
			const result = await fetchCachedManifest({
				config: { manifestURL: source.manifestURL },
				fetch: source.fetch,
				onBackgroundRevalidate: bindBackgroundRevalidate(options, event),
				query,
			});

			const headers = new Headers({ 'content-type': 'application/json' });
			for (const name of MANIFEST_PASSTHROUGH_HEADERS) {
				const value = result.headers[name];
				if (value) {
					headers.set(name, value);
				}
			}

			headers.set('age', String(getManifestAge(result)));
			const { etag } = result.headers;
			if (etag && event.request.headers.get('if-none-match') === etag) {
				return new Response(null, { headers, status: 304 });
			}

			return new Response(JSON.stringify(result.manifest), {
				headers,
				status: 200,
			});
		};

		const proxy: RequestHandler = async (event) => {
			if (!proxyOptions) {
				return Response.json({ error: 'Not found' }, { status: 404 });
			}
			const backend = resolveProxyBackend(event, options);
			return await proxyConsentRequest({
				backendURL: backend.url,
				event,
				fetch: backend.fetch as typeof globalThis.fetch | undefined,
				options: proxyOptions,
			});
		};

		const GET: RequestHandler = (event) => {
			// Dispatch on the rest parameter when the route has one, so a
			// proxied path such as `reports/manifest` still reaches the backend.
			const restPath = readRestPath(event);
			const isManifest =
				restPath === undefined
					? event.url.pathname.endsWith(MANIFEST_ROUTE_SUFFIX)
					: restPath === 'manifest';
			if (isManifest) {
				return manifest(event);
			}
			return proxyOptions && restPath && restPath !== 'init'
				? proxy(event)
				: init(event);
		};

		const handlers: SvelteKitConsentRouteHandlers = { GET, init, manifest };
		if (!proxyOptions) {
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
