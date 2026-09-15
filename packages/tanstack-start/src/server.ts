/**
 * `@c15t/tanstack-start/server` server-only helpers.
 *
 * Reads the incoming request (cookies + headers via `getRequest()` from
 * `@tanstack/react-start/server`) and produces a JSON-serializable
 * `ConsentState` (a `KernelConfig` without `transport`). The root route
 * loader returns it, and the client `ConsentRoot` reads it back with
 * `Route.useLoaderData()`.
 *
 * The recommended `__root.tsx` shape:
 *
 * ```tsx
 * import { createRootRoute, Outlet } from '@tanstack/react-router';
 * import { createServerFn } from '@tanstack/react-start';
 * import { ConsentRoot } from '@c15t/tanstack-start';
 * import {
 *   consentLoaderOptions,
 *   createConsentStateHandler,
 * } from '@c15t/tanstack-start/server';
 *
 * const getConsentState = createServerFn({ method: 'GET' }).handler(
 *   createConsentStateHandler({ backendURL: 'https://consent.example.com' })
 * );
 *
 * export const Route = createRootRoute({
 *   ...consentLoaderOptions,
 *   loader: () => getConsentState(),
 *   component: RootComponent,
 * });
 *
 * function RootComponent() {
 *   const state = Route.useLoaderData();
 *   return (
 *     <ConsentRoot state={state} backendURL="https://consent.example.com">
 *       <Outlet />
 *     </ConsentRoot>
 *   );
 * }
 * ```
 *
 * The state travels only through loader data, never through module state,
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
import type { KernelConfig } from '@c15t/core';
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
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
}: KernelConfig): ConsentState {
	return config;
};

/**
 * Consent inputs for a request: what `consentRequestMiddleware` remembered
 * when it ran (so overrides survive immutable headers), otherwise the raw
 * headers, with explicit `country`/`language` options winning either way.
 */
const resolveRequestInputs = function resolveRequestInputs(
	request: Request,
	options: Pick<ConsentRequestOptions, 'country' | 'language'>
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

/**
 * How {@link resolveConsent} reads the current request: the clock, the
 * consent cookie, explicit geo/language overrides, and the request source.
 */
export interface ConsentRequestOptions {
	/** Request clock reused for validation and hydration. */
	now?: number;
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
 * The cookie-and-headers half of {@link resolveConsent}: the state the
 * request alone determines, before any manifest is consulted.
 *
 * What it reads:
 * - Cookie, defaulting to `c15t`, read with the persistence parser. A
 *   returning visitor therefore hydrates with `initialHasConsented: true`
 *   and no banner is server-rendered.
 * - CDN geo headers (`cf-ipcountry`, `x-vercel-ip-country`, ...) and the
 *   `x-c15t-*` overrides written by `consentRequestMiddleware()`.
 * - The negotiated `accept-language` entry and the `sec-gpc` signal.
 *
 * It does not fetch from the backend, does not set cookies (writes happen
 * client-side via the persistence module), and does not cache across
 * requests.
 */
const readRequestState = function readRequestState(
	request: Request,
	options: ConsentRequestOptions
): ConsentState {
	const cookieHeader = request.headers.get('cookie') ?? undefined;
	const now = options.now ?? Date.now();
	const initialRecords = readStoredRecordsFromCookieHeader(
		cookieHeader,
		options.cookieName ? { storageKey: options.cookieName } : undefined,
		now
	);
	const inputs = resolveRequestInputs(request, options);
	const overrides = consentInputsToOverrides({ ...inputs, gpc: undefined });
	const state: ConsentState = {
		initialPrivacySignals: { gpc: inputs.gpc },
		initialRecords,
		now,
	};

	if (Object.keys(overrides).length > 0) {
		state.initialOverrides = overrides;
	}

	return state;
};

/**
 * Type alias re-exported so consumers can stay within
 * `@c15t/tanstack-start`.
 */
export type { KernelConfig } from '@c15t/core';

/**
 * The visitor's resolved consent state: the JSON-serializable subset of
 * `KernelConfig` the server helpers return and `ConsentRoot` consumes.
 *
 * `KernelConfig.transport` holds functions, and TanStack Start's server
 * function types reject any return value that may carry one. Returning this
 * narrower type is what lets `createServerFn().handler(...)` accept the
 * helpers directly. `ConsentRoot` accepts it as-is.
 */
export type ConsentState = Omit<KernelConfig, 'transport'>;

// -- Resolving the visitor's state ------------------------------------------

/** Options for {@link resolveConsent}. */
export interface ResolveConsentOptions extends ConsentRequestOptions {
	/**
	 * Backend base URL of your c15t instance, for example
	 * `https://consent.example.com`. When set, the helper reads
	 * `${backendURL}/manifest` through the in-process manifest cache and
	 * resolves init locally, so the first paint already carries policy, UI,
	 * translations, and IAB metadata. Omit it to only read cookies and
	 * headers; the client then runs init through the same-origin route.
	 *
	 * Relative URLs are resolved against the request's own origin
	 * (`request.url`); set `trustForwardedHeaders` to use `x-forwarded-*`
	 * behind a trusted proxy. Do not point this at the app's own `/api/c15t` route:
	 * a server fetching itself during SSR deadlocks the dev server, so the
	 * helper skips that case and returns the cookie-and-headers state instead.
	 */
	backendURL?: string;

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
	 * Receives the promise of a background manifest revalidation started by
	 * this request, so the host can keep it alive past the response on
	 * runtimes that stop detached work once a response is sent (a platform
	 * `waitUntil`, for example). The promise never rejects. Not called when
	 * the manifest is fresh or the request itself waits on the upstream.
	 */
	onBackgroundRevalidate?: (revalidation: Promise<void>) => void;

	/**
	 * Same-origin prefix where you mounted `createConsentServerRoute()`.
	 * Set this explicitly to route deferred public vendor lists through it.
	 * Without it, lists use the manifest URL directly. Self-route detection
	 * still checks `/api/c15t` by default.
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
	options: ResolveConsentOptions & { backendURL: string },
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
		onBackgroundRevalidate: options.onBackgroundRevalidate,
		sourceURL,
	});
	return { backendURL, manifest: cached.manifest };
};

/**
 * Resolves the visitor's consent state from the current TanStack Start
 * request.
 *
 * 1. Reads the consent cookie, the CDN geo headers (plus the `x-c15t-*`
 *    overrides `consentRequestMiddleware()` wrote), `accept-language`, and
 *    `sec-gpc`. Without a `backendURL` this is the whole result: the client
 *    then runs init through the same-origin route on mount.
 * 2. With a `backendURL`, loads the consent manifest through the
 *    in-process cache (or uses the inline `manifest`) and resolves init
 *    locally for this request's country, region, language, and GPC signal.
 * 3. Folds the result into the state so first paint is correct without
 *    waiting for a client roundtrip.
 *
 * Never calls the app's own `/api/c15t` route. If anything fails, returns
 * the cookie-and-headers state: the client root then runs init on mount.
 *
 * @param options - Request source and overrides, plus the backend location
 * and manifest source for the prefetch.
 * @returns A serializable state for `ConsentRoot`.
 */
export const resolveConsent = async function resolveConsent(
	options: ResolveConsentOptions = {}
): Promise<ConsentState> {
	const request = await readCurrentRequest(options.request);
	const base = readRequestState(request, options);
	const { backendURL } = options;
	if (!backendURL) {
		return base;
	}

	try {
		const forward = collectForwardHeaders(
			request,
			options.forwardHeaders,
			options.cookieNames
		);
		const loaded = await loadManifest(
			{ ...options, backendURL },
			request,
			forward
		);
		if (!loaded) {
			return base;
		}
		const inputs = resolveRequestInputs(request, options);
		const deferGvl = !options.fetch && Object.keys(forward).length === 0;
		const transport = createManifestTransport({
			backendURL: loaded.backendURL,
			baseTranslations,
			deferGvl,
			fetch: options.fetch,
			gvlRoute:
				deferGvl && options.routePrefix
					? `${options.routePrefix}/init`
					: undefined,
			headers: forward,
			inputs,
			manifest: loaded.manifest,
		});
		const response = await transport.init?.({
			overrides: {
				...(base.initialOverrides ?? {}),
				...consentInputsToOverrides({ ...inputs, gpc: undefined }),
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
 * returned) into a consent state. Exposed for custom loaders that already
 * hold an `InitOutput`.
 *
 * @param base - State from {@link resolveConsent} without a `backendURL`.
 * @param init - The init payload to merge.
 * @returns The merged state.
 */
export const mergeInitIntoConsentState = function mergeInitIntoConsentState(
	base: ConsentState,
	init: InitOutput
): ConsentState {
	return stripTransport(mergeInitOutputIntoKernelConfig(base, init));
};

// -- Route wiring ------------------------------------------------------------

/**
 * Root route options that keep the consent loader from re-running on
 * client-side navigation. Spread them into `createRootRoute()` next to
 * the loader. The state only changes when the request changes, and a
 * client navigation reuses the same request context, so re-running would
 * only re-serialize the same value.
 *
 * @example
 * ```ts
 * export const Route = createRootRoute({
 *   ...consentLoaderOptions,
 *   loader: () => getConsentState(),
 * });
 * ```
 */
export const consentLoaderOptions = {
	shouldReload: false,
	staleTime: Number.POSITIVE_INFINITY,
} as const;

/**
 * Builds the handler for the consent state server function.
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
 * import { createConsentStateHandler } from '@c15t/tanstack-start/server';
 *
 * export const getConsentState = createServerFn({ method: 'GET' }).handler(
 *   createConsentStateHandler({ backendURL: 'https://consent.example.com' })
 * );
 * ```
 *
 * Omit `backendURL` to skip the manifest prefetch and only read cookies
 * and headers; the client then runs init through the same-origin route.
 *
 * @param options - {@link resolveConsent} options; `request` defaults to
 * `getRequest()`.
 * @returns A handler that resolves to the request's consent state.
 */
export const createConsentStateHandler = function createConsentStateHandler(
	options: ResolveConsentOptions = {}
): () => Promise<ConsentState> {
	return () => resolveConsent(options);
};
