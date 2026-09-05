/**
 * `@c15t/tanstack-start/server` server-only helpers.
 *
 * Reads the incoming request (cookies + headers via `getRequest()` from
 * `@tanstack/react-start/server`) and produces a JSON-serializable
 * `ConsentConfig` (a `KernelConfig` without `transport`). The root route
 * loader returns it, and the client `ConsentBoundary` reads it back with
 * `Route.useLoaderData()`.
 *
 * The recommended `__root.tsx` shape:
 *
 * ```tsx
 * import { createRootRoute, Outlet } from '@tanstack/react-router';
 * import { createServerFn } from '@tanstack/react-start';
 * import { ConsentBoundary } from '@c15t/tanstack-start';
 * import {
 *   consentLoaderOptions,
 *   createConsentConfigHandler,
 * } from '@c15t/tanstack-start/server';
 *
 * const getConsentConfig = createServerFn({ method: 'GET' }).handler(
 *   createConsentConfigHandler({ backendURL: 'https://consent.example.com' })
 * );
 *
 * export const Route = createRootRoute({
 *   ...consentLoaderOptions,
 *   loader: () => getConsentConfig(),
 *   component: RootComponent,
 * });
 *
 * function RootComponent() {
 *   const config = Route.useLoaderData();
 *   return (
 *     <ConsentBoundary config={config} backendURL="https://consent.example.com">
 *       <Outlet />
 *     </ConsentBoundary>
 *   );
 * }
 * ```
 *
 * The config travels only through loader data, never through module state,
 * so the server-rendered HTML and the hydrated tree always agree. Because
 * the loader is a server function call, the same code keeps working under
 * `ssr: false`, `ssr: 'data-only'`, and `defaultSsr: false`: the loader
 * then runs in the browser and the server function becomes an HTTP call
 * to the Start server, which still reads the real request headers.
 *
 * This module imports `@tanstack/react-start/server` lazily and must only
 * run on the server: inside server functions, server route handlers, and
 * request middleware.
 */

import {
	mergeInitResponseIntoKernelConfig,
	mergeInitOutputIntoKernelConfig,
} from '@c15t/core';
import type { KernelConfig, KernelOverrides } from '@c15t/core';
import { readStoredConsentFromCookie } from '@c15t/core/modules/persistence';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import {
	fetchCachedManifest,
	resolveManifestSourceURL,
} from '@c15t/core/transports/manifest-cache';
import type { ManifestCache } from '@c15t/core/transports/manifest-cache';
import type { ConsentManifest, InitOutput } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from './headers';
import { filterCookieHeader } from './libs/cookies';
import { FORWARDING_HEADERS, stripIdentityForCleartext } from './libs/proxy';
import { readConsentInputs } from './libs/request-inputs';
import { isSelfRoute, resolveRequestURL } from './libs/request-url';

type Awaitable<Value> = Promise<Value> | Value;

export type { ManifestCache } from '@c15t/core/transports/manifest-cache';

/**
 * Where the helpers read the current request from. Defaults to
 * `getRequest()` from `@tanstack/react-start/server`.
 */
export type ConsentRequestSource = Request | (() => Awaitable<Request>);

/** Default same-origin prefix served by `createConsentServerRoute()`. */
const DEFAULT_ROUTE_PREFIX = '/api/c15t';

/**
 * The core merge helpers type their result as the full `KernelConfig`. They
 * never set `transport`, so dropping the key only narrows the type; it keeps
 * the loader payload provably serializable.
 */
const stripTransport = function stripTransport({
	transport: _transport,
	...config
}: KernelConfig): ConsentConfig {
	return config;
};

/**
 * Consent inputs for a request: what `consentRequestMiddleware` remembered
 * when it ran (so overrides survive immutable headers), otherwise the raw
 * headers, with explicit `country`/`language` options winning either way.
 */
const resolveRequestInputs = function resolveRequestInputs(
	request: Request,
	options: Pick<ReadInitialConsentConfigOptions, 'country' | 'language'>
) {
	const remembered = readConsentInputs(request);
	if (!remembered) {
		return extractConsentRequestInputs(request.headers, {
			country: options.country,
			language: options.language,
		});
	}
	const inputs = { ...remembered };
	if (options.country) {
		inputs.country = options.country;
	}
	if (options.language) {
		inputs.language = options.language;
	}
	return inputs;
};

const readCurrentRequest = async function readCurrentRequest(
	source: ConsentRequestSource | undefined
): Promise<Request> {
	if (source instanceof Request) {
		return source;
	}
	if (source) {
		return await source();
	}
	const { getRequest } = await import('@tanstack/react-start/server');
	return getRequest();
};

export interface ReadInitialConsentConfigOptions {
	/**
	 * Cookie name holding persisted consent. Defaults to `c15t`, the
	 * persistence module's storage key. Set this only if you customized
	 * `storageConfig.storageKey` client-side; it must match.
	 */
	cookieName?: string;

	/**
	 * If provided, override the auto-detected country from request headers.
	 * Mainly useful for tests and local development.
	 */
	country?: string;

	/**
	 * If provided, override the auto-detected language.
	 */
	language?: string;

	/**
	 * The request to read, or a function that returns it. Defaults to
	 * `getRequest()` from `@tanstack/react-start/server`. Pass a plain
	 * `Request` in tests, or the `request` a server route handler or
	 * request middleware already holds.
	 */
	request?: ConsentRequestSource;
}

/**
 * Derive a `KernelConfig` from the current TanStack Start request.
 *
 * What it reads:
 * - Cookie, defaulting to `c15t`, read with the persistence parser. A
 *   returning visitor therefore hydrates with `initialHasConsented: true`
 *   and no banner is server-rendered.
 * - CDN geo headers (`cf-ipcountry`, `x-vercel-ip-country`, ...) and the
 *   `x-c15t-*` overrides written by `consentRequestMiddleware()`.
 * - The negotiated `accept-language` entry and the `sec-gpc` signal.
 *
 * What it does NOT do:
 * - Does not fetch from the backend. Banner info and translations come
 *   from init once the client kernel mounts, or from
 *   {@link prefetchInitialConsent} when you want them in the first paint.
 * - Does not set cookies. Writes happen client-side via the persistence
 *   module.
 * - Does not cache across requests.
 *
 * @param options - Cookie name, overrides, and the request source.
 * @returns A serializable kernel config for `ConsentBoundary`.
 */
export const readInitialConsentConfig = async function readInitialConsentConfig(
	options: ReadInitialConsentConfigOptions = {}
): Promise<ConsentConfig> {
	const request = await readCurrentRequest(options.request);
	const cookieHeader = request.headers.get('cookie') ?? undefined;
	const persisted = readStoredConsentFromCookie(
		cookieHeader,
		options.cookieName ? { storageKey: options.cookieName } : undefined
	);
	const storedConsent =
		persisted?.consents && persisted.consentInfo
			? {
					consents: persisted.consents,
					subjectId:
						typeof persisted.consentInfo.subjectId === 'string'
							? persisted.consentInfo.subjectId
							: undefined,
				}
			: undefined;

	const inputs = resolveRequestInputs(request, options);
	const overrides = consentInputsToOverrides(inputs) as KernelOverrides;

	const config: ConsentConfig = {};
	if (storedConsent) {
		config.initialConsents = storedConsent.consents;
		config.initialHasConsented = true;
		if (storedConsent.subjectId) {
			config.initialSubjectId = storedConsent.subjectId;
		}
	}
	if (Object.keys(overrides).length > 0) {
		config.initialOverrides = overrides;
	}

	return config;
};

/**
 * Type alias re-exported so consumers can stay within
 * `@c15t/tanstack-start`.
 */
export type { KernelConfig } from '@c15t/core';

/**
 * The JSON-serializable subset of `KernelConfig` the server helpers return.
 *
 * `KernelConfig.transport` holds functions, and TanStack Start's server
 * function types reject any return value that may carry one. Returning this
 * narrower type is what lets `createServerFn().handler(...)` accept the
 * helpers directly. `ConsentBoundary` accepts it as-is.
 */
export type ConsentConfig = Omit<KernelConfig, 'transport'>;

// -- Optional: server-side prefetch of the init roundtrip -------------------

export interface PrefetchInitialConsentOptions extends ReadInitialConsentConfigOptions {
	/**
	 * Backend base URL of your c15t instance, for example
	 * `https://consent.example.com`. The helper reads `${backendURL}/manifest`
	 * through the in-process manifest cache and resolves init locally, so the
	 * first paint already carries policy, UI, translations, and IAB metadata.
	 *
	 * Relative URLs are resolved against the request's own origin
	 * (`request.url`); set `trustForwardedHeaders` to use `x-forwarded-*`
	 * behind a trusted proxy. Do not point this at the app's own `/api/c15t` route:
	 * a server fetching itself during SSR deadlocks the dev server, so the
	 * helper skips that case and returns the baseline config instead.
	 */
	backendURL: string;

	/**
	 * Absolute `GET /manifest` URL. Overrides `${backendURL}/manifest`.
	 */
	manifestURL?: string;

	/**
	 * Inline manifest for hosts that already loaded it (an in-process
	 * `@c15t/backend`, a build-time module from
	 * `@c15t/tanstack-start/static`). Takes precedence over `manifestURL`
	 * and keeps the request path network-free.
	 */
	manifest?: ConsentManifest;

	/**
	 * Fetch implementation for the manifest and GVL requests. Defaults to
	 * `globalThis.fetch`.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Request headers to forward onto the manifest fetch, for example an
	 * authentication token a private backend requires. Keep these
	 * tenant-level: the manifest cache is partitioned by a digest of the
	 * forwarded headers, so a per-visitor value defeats the cache.
	 */
	forwardHeaders?: string[];

	/**
	 * Cookie names to forward on the manifest fetch. No cookies are
	 * forwarded by default: the manifest is tenant-level data and the c15t
	 * backend does not read cookies, so nothing from your origin's cookie
	 * jar needs to leave. Set this only for a backend that gates the
	 * manifest on a cookie.
	 */
	cookieNames?: readonly string[];

	/**
	 * Resolve a relative `backendURL` or `manifestURL` against the
	 * request's `x-forwarded-host` and `x-forwarded-proto` instead of
	 * `request.url`. Off by default because those headers are
	 * client-controlled unless a trusted proxy strips them; turn it on only
	 * behind such a proxy.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Manifest cache to read through. Defaults to the module-level cache
	 * shared with `createConsentServerRoute()`. Pass `createManifestCache()`
	 * to isolate tests or tenants.
	 */
	cache?: ManifestCache;

	/**
	 * Same-origin prefix of the consent server route, used to detect a
	 * self-referencing `backendURL`. Only change it if you mount
	 * `createConsentServerRoute()` somewhere other than `/api/c15t/$`.
	 *
	 * @default '/api/c15t'
	 */
	routePrefix?: string;
}

const collectForwardHeaders = function collectForwardHeaders(
	request: Request,
	names: string[] | undefined,
	cookieNames: readonly string[] | undefined
): Record<string, string> {
	const forward: Record<string, string> = {};
	const cookie = request.headers.get('cookie');
	const scopedCookie =
		cookie && cookieNames ? filterCookieHeader(cookie, cookieNames) : undefined;
	if (scopedCookie) {
		forward.cookie = scopedCookie;
	}
	for (const name of names ?? []) {
		const lower = name.toLowerCase();
		if (lower === 'cookie' || FORWARDING_HEADERS.has(lower)) {
			// Cookies travel only through `cookieNames`, never as a whole, and
			// hop-chain headers are never copied from the visitor.
			continue;
		}
		const value = request.headers.get(name);
		if (value) {
			forward[lower] = value;
		}
	}
	return forward;
};

const loadManifest = async function loadManifest(
	options: PrefetchInitialConsentOptions,
	request: Request,
	forward: Record<string, string>
): Promise<{ backendURL: string; manifest: ConsentManifest } | null> {
	const trust = options.trustForwardedHeaders ?? false;
	const backendURL = resolveRequestURL(options.backendURL, request, trust);
	if (!backendURL) {
		return null;
	}
	if (options.manifest) {
		return { backendURL, manifest: options.manifest };
	}
	const manifestURL = options.manifestURL
		? resolveRequestURL(options.manifestURL, request, trust)
		: undefined;
	if (options.manifestURL && !manifestURL) {
		return null;
	}
	const sourceURL = resolveManifestSourceURL({
		backendURL,
		manifestURL: manifestURL ?? undefined,
	});
	if (
		isSelfRoute(sourceURL, request, options.routePrefix ?? DEFAULT_ROUTE_PREFIX)
	) {
		// Fetching the app's own consent route from inside SSR would wait on
		// the very server that is rendering this request.
		return null;
	}
	const cached = await fetchCachedManifest({
		cache: options.cache,
		fetch: options.fetch,
		headers: stripIdentityForCleartext(forward, sourceURL),
		sourceURL,
	});
	return { backendURL, manifest: cached.manifest };
};

/**
 * Server-side consent prefetch.
 *
 * 1. Reads cookies + geo headers like {@link readInitialConsentConfig}.
 * 2. Loads the consent manifest through the in-process cache (or uses the
 *    inline `manifest`) and resolves init locally for this request's
 *    country, region, language, and GPC signal.
 * 3. Folds the result into a `KernelConfig` so first paint is correct
 *    without waiting for a client roundtrip.
 *
 * Never calls the app's own `/api/c15t` route. If anything fails, returns
 * the baseline config: the client boundary then runs init on mount.
 *
 * @param options - Backend location, manifest source, and request source.
 * @returns A serializable kernel config for `ConsentBoundary`.
 */
export const prefetchInitialConsent = async function prefetchInitialConsent(
	options: PrefetchInitialConsentOptions
): Promise<ConsentConfig> {
	const request = await readCurrentRequest(options.request);
	const base = await readInitialConsentConfig({ ...options, request });

	try {
		const forward = collectForwardHeaders(
			request,
			options.forwardHeaders,
			options.cookieNames
		);
		const loaded = await loadManifest(options, request, forward);
		if (!loaded) {
			return base;
		}
		const inputs = resolveRequestInputs(request, options);
		const transport = createManifestTransport({
			backendURL: loaded.backendURL,
			baseTranslations,
			fetch: options.fetch,
			headers: forward,
			inputs,
			manifest: loaded.manifest,
		});
		const response = await transport.init?.({
			overrides: {
				...(base.initialOverrides ?? {}),
				...consentInputsToOverrides(inputs),
			},
			user: base.initialUser ?? null,
		});
		if (!response) {
			return base;
		}
		return stripTransport(mergeInitResponseIntoKernelConfig(base, response));
	} catch {
		// Silent degradation. Client-side init will retry.
		return base;
	}
};

/**
 * Folds a raw init payload (for example the JSON a same-origin init route
 * returned) into a kernel config. Exposed for custom loaders that already
 * hold an `InitOutput`.
 *
 * @param base - Config from {@link readInitialConsentConfig}.
 * @param init - The init payload to merge.
 * @returns The merged kernel config.
 */
export const mergeInitIntoConsentConfig = function mergeInitIntoConsentConfig(
	base: ConsentConfig,
	init: InitOutput
): ConsentConfig {
	return stripTransport(mergeInitOutputIntoKernelConfig(base, init));
};

// -- Route wiring ------------------------------------------------------------

/**
 * Root route options that keep the consent loader from re-running on
 * client-side navigation. Spread them into `createRootRoute()` next to
 * the loader. The config only changes when the request changes, and a
 * client navigation reuses the same request context, so re-running would
 * only re-serialize the same value.
 *
 * @example
 * ```ts
 * export const Route = createRootRoute({
 *   ...consentLoaderOptions,
 *   loader: () => getConsentConfig(),
 * });
 * ```
 */
export const consentLoaderOptions = {
	shouldReload: false,
	staleTime: Number.POSITIVE_INFINITY,
} as const;

/**
 * Builds the handler for the consent config server function.
 *
 * TanStack Start keys each server function's ID to the file path of the
 * `createServerFn().handler()` call site and requires that call to be a
 * top-level assignment in your own module, so a function built inside this
 * package would carry an ID bound to the package's build and fail to
 * resolve at runtime. Declare the server function in your code and pass
 * this factory's result as its handler:
 *
 * @example
 * ```ts
 * import { createServerFn } from '@tanstack/react-start';
 * import { createConsentConfigHandler } from '@c15t/tanstack-start/server';
 *
 * export const getConsentConfig = createServerFn({ method: 'GET' }).handler(
 *   createConsentConfigHandler({ backendURL: 'https://consent.example.com' })
 * );
 * ```
 *
 * Omit `backendURL` to skip the manifest prefetch and only read cookies
 * and headers; the client then runs init through the same-origin route.
 *
 * @param options - Prefetch options; `request` defaults to `getRequest()`.
 * @returns A handler that resolves to the request's kernel config.
 */
export const createConsentConfigHandler = function createConsentConfigHandler(
	options: PrefetchInitialConsentOptions | ReadInitialConsentConfigOptions = {}
): () => Promise<ConsentConfig> {
	return () =>
		'backendURL' in options && options.backendURL
			? prefetchInitialConsent(options)
			: readInitialConsentConfig(options);
};
