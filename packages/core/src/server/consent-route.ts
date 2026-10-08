/**
 * Same-origin consent routes, written once for every server adapter.
 *
 * Manifest mode moves policy resolution off the browser's critical path:
 * the host reads one geo-independent, CDN-cacheable manifest and resolves
 * `/init` locally per request. This module turns a Web `Request` into the
 * `Response` for those routes:
 *
 * - `GET …/manifest` passes the cached backend manifest through with its
 *   cache headers, `Age` and `ETag` revalidation.
 * - `GET …/init` resolves the visitor's init from that manifest (geo,
 *   language, GPC), negotiates the policy contract, attaches the Global
 *   Vendor List for IAB policies and reports the session to the backend.
 *   The same route serves versioned vendor-list requests (`?c15t-gvl=`).
 * - With `proxy` on, every other allowlisted path is forwarded to the
 *   backend through {@link forwardConsentRequest}.
 *
 * Framework adapters (Next.js, TanStack Start, SvelteKit, Astro, Nuxt) only
 * translate their entry point into a `Request` and a
 * {@link ConsentRouteRequestContext}: which route was hit, how to keep
 * detached work alive, and how to reach the app's own routes in-process.
 *
 * Server-only: it resolves init with every bundled translation and forwards
 * the visitor's IP to the backend in session reports.
 */

import {
	appendJourneyParams,
	CONSENT_REQUEST_HEADER_NAMES,
	getIpAddress,
	parsePolicyContractHeader,
	POLICY_CONTRACT_HEADER,
	POLICY_CONTRACT_VERSION,
	readJourneyParams,
	readPolicyResolutionWire,
	writePolicyResolutionWire,
} from '@c15t/schema/types';
import type {
	ConsentManifest,
	ConsentManifestGVLReference,
	ConsentSessionSource,
	GlobalVendorList,
	InitOutput,
	ResolveInitFromManifestInputs,
	SessionJourney,
} from '@c15t/schema/types';

import {
	fetchCachedManifest,
	getManifestAge,
	MANIFEST_PASSTHROUGH_HEADERS,
	ManifestUnavailableError,
	withResolutionBudget,
} from '../libs/manifest-cache-runtime';
import type {
	CachedManifestResponse,
	ManifestCache,
	ManifestFetch,
} from '../libs/manifest-cache-runtime';
import { reportConsentSession } from '../libs/session-report';
import {
	deferInitGvlToRoute,
	serveGvlReference,
} from '../transports/gvl-reference';
import { mapInitOutputToInitResponse } from '../transports/init-output';
import {
	getResolverInputsFromHeaders,
	resolveManifestInit,
} from '../transports/manifest-cache';
import {
	c15tProtocolHeaders,
	readProducerPolicyContract,
} from '../transports/version-header';
import {
	CONSENT_PROXY_FORWARDING_HEADERS,
	filterCookieHeader,
	forwardConsentRequest,
	resolveConsentProxyOptions,
	stripIdentityForCleartext,
} from './consent-proxy';
import type {
	ConsentProxyForwarding,
	ConsentProxyOptions,
} from './consent-proxy';
import { fetchCachedGvl } from './gvl-cache';
import { resolveRequestBackendURL } from './request-origin';

/**
 * Request header a server render sets on its call to the init route: the
 * longest, in whole milliseconds, the route may wait for upstream work
 * (manifest, vendor list, `/init` fallback) before failing. Values above
 * ten seconds are capped; anything that is not a whole number is ignored.
 */
export const CONSENT_ROUTE_TIMEOUT_HEADER = 'x-c15t-timeout-ms';

/** Longest request-supplied budget honoured, in milliseconds. */
const MAX_ROUTE_TIMEOUT_MS = 10_000;

const INIT_CACHE_CONTROL = 'private, no-store';

/**
 * Origin a `/`-relative URL is placed on when the adapter can answer its
 * own routes in-process. It is never contacted: requests to it go to
 * {@link ConsentRouteRequestContext.localFetch} as a path. Loopback, so the
 * cleartext rules treat the in-process hop as local.
 */
const IN_PROCESS_ORIGIN = 'http://localhost';

/** A conservative BCP 47 shape: primary subtag plus up to two subtags. */
const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,2}$/u;

/** Which consent route a request is for. */
export type ConsentRouteName = 'manifest' | 'init' | 'proxy';

/**
 * Loads the Global Vendor List for an IAB policy. Replaces the default
 * loader, which reads through the server GVL cache with a deadline.
 */
export type ConsentRouteFetchGvl = (input: {
	/** The manifest's vendor-list reference. */
	reference: ConsentManifestGVLReference;
	/** Primary language subtag the list should be localised to. */
	language: string;
	/** The route's configured fetch. */
	fetch: typeof globalThis.fetch;
}) => Promise<GlobalVendorList | null>;

/** Configuration for {@link createConsentRouteHandler}. */
export interface ConsentRouteHandlerOptions {
	/**
	 * Package name of the adapter, such as `@c15t/nextjs`. Prefixes errors,
	 * names the adapter in session reports, and is sent as `x-c15t-proxy`.
	 */
	adapter: string;
	/**
	 * Backend base URL, absolute or `/`-relative. The manifest is read from
	 * `${backendURL}/manifest` unless `manifestURL` is set; session reports,
	 * the `/init` fallback and the proxy go here.
	 */
	backendURL?: string;
	/** Full upstream manifest URL. Takes precedence over `backendURL`. */
	manifestURL?: string;
	/**
	 * An inline manifest. When set, no manifest is fetched and the backend
	 * is used only for reports and the proxy.
	 */
	manifest?: ConsentManifest;
	/** Fetch for absolute upstream URLs. Defaults to `globalThis.fetch`. */
	fetch?: ManifestFetch;
	/**
	 * Per-framework fetch hint for the manifest request, such as Next.js
	 * `{ next: { revalidate: 300 } }`. Not part of the cache key.
	 */
	manifestFetchInit?: Omit<RequestInit, 'headers' | 'method'>;
	/** Replaces the default Global Vendor List loader. */
	fetchGvl?: ConsentRouteFetchGvl;
	/**
	 * Resolve a relative `backendURL` or `manifestURL` against the request's
	 * forwarding headers instead of `request.url`, and believe the client IP
	 * chain when proxying. Only behind a proxy that sets those headers and
	 * drops incoming ones.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;
	/**
	 * Report each init the route resolves to the backend's `POST /sessions`.
	 * Needs an absolute `backendURL`.
	 *
	 * @default true
	 */
	reportSessions?: boolean;
	/**
	 * Forward consent writes and other allowlisted paths to `backendURL`.
	 * With it on, the manifest request also carries the cookies
	 * `cookieNames` names and the extra `forwardHeaders`, and a manifest
	 * read with them is answered `private, no-store`.
	 *
	 * @default false
	 */
	proxy?: boolean | ConsentProxyOptions;
	/**
	 * Manifest cache to read through. Defaults to the process cache every
	 * adapter shares.
	 */
	cache?: ManifestCache;
}

/** What the adapter knows about one request that a `Request` does not carry. */
export interface ConsentRouteRequestContext {
	/**
	 * The route this request is for, when the adapter mounted a dedicated
	 * handler. Without it the route comes from {@link path}.
	 */
	route?: ConsentRouteName;
	/**
	 * Path below the route prefix, from a catch-all parameter (`manifest`,
	 * `init`, `subjects/sub_1`). `''` and `init` answer init, `manifest`
	 * answers the manifest, anything else goes to the proxy or is a 404.
	 * Without a path the route is a fixed mount: its last URL segment
	 * decides, and a `GET` that does not end in `/manifest` is init.
	 */
	path?: string;
	/**
	 * Keeps detached work alive past the response: background manifest
	 * refreshes, session reports, fills a request stopped waiting for, and
	 * the rest of a request whose client went away.
	 */
	waitUntil?: (task: Promise<void>) => void;
	/**
	 * Fetch that answers this app's own routes in-process when given a path,
	 * such as SvelteKit `event.fetch` or Nitro `localFetch`. When set, a
	 * `/`-relative `backendURL` or `manifestURL` is fetched through it and
	 * the request's host never decides the target.
	 */
	localFetch?: ManifestFetch;
	/**
	 * Hop-chain values for the proxy, when the framework knows them better
	 * than the request does (SvelteKit `event.getClientAddress()`). Defaults
	 * to the request URL, plus the forwarding headers under
	 * `trustForwardedHeaders`.
	 */
	forwarding?: () => ConsentProxyForwarding;
	/**
	 * Resolver inputs the adapter already derived, such as a middleware's
	 * normalized geo or a configured locale. Defaults to the request headers.
	 */
	inputs?: ResolveInitFromManifestInputs;
}

/** A consent route: Web `Request` in, `Response` out. */
export type ConsentRouteHandler = (
	request: Request,
	context?: ConsentRouteRequestContext
) => Promise<Response>;

/** How a resolution reports itself to the backend's `POST /sessions`. */
export interface ConsentInitReport {
	/** Package name of the adapter. */
	adapter: string;
	/** Absolute backend URL as configured; anything else sends no report. */
	backendURL: string | undefined;
	/** Where the resolution happened. */
	source: ConsentSessionSource;
	/** The visitor's request headers; only IP and user agent travel. */
	headers: Headers;
	/** The request's method, when there is one; only a `GET` is reported. */
	method?: string;
	/** Fetch for the report. */
	fetch?: typeof globalThis.fetch;
	/** Keeps the detached report alive. */
	waitUntil?: (task: Promise<void>) => void;
	/**
	 * Whether the caller stopped waiting for this resolution, checked just
	 * before the report goes out. A render or request that gave up leaves
	 * the browser to resolve the view again, and that resolution reports it.
	 */
	abandoned?: () => boolean;
	/** The experiment arm a server render ran, while there is no choice. */
	experiment?: { id: string; arm: string };
	/**
	 * The consent journey a server render created. An init route leaves it
	 * out and passes {@link ConsentInitReport.url}: the browser sends its
	 * journey as query parameters.
	 */
	journey?: SessionJourney;
	/** The browser's request URL, which may carry its consent journey. */
	url?: string;
}

/** Input for {@link resolveConsentInit}. */
export interface ResolveConsentInitOptions {
	/** The manifest to resolve against. */
	manifest: ConsentManifest;
	/** Geo, language and GPC for this visitor. */
	inputs: ResolveInitFromManifestInputs;
	/**
	 * Loads the vendor list in a language. Called only when the manifest
	 * enables IAB, names a list, and the resolved policy is the IAB model.
	 * A rejection rejects the resolution.
	 */
	loadGvl?: (language: string) => Promise<GlobalVendorList | null>;
	/**
	 * The client's `x-c15t-policy-contract` header, if it sent one. A value
	 * other than the supported version fails the resolution.
	 */
	clientContract?: string | null;
	/** Session report to send once resolved. Absent means none. */
	report?: ConsentInitReport;
}

/**
 * Applies the policy contract to an init payload. A client that declares a
 * contract other than {@link POLICY_CONTRACT_VERSION} gets a failed
 * `unsupported-contract` resolution; a client that declares none is treated
 * as compatible. Whenever the resolution is not `matched`, every field that
 * only a matched policy may carry is removed (`policySnapshotToken`, `gvl`,
 * `gvlReference`, `cmpId`, `customVendors`), so no stale proof travels with
 * the new outcome.
 */
const negotiateInit = function negotiateInit(
	output: InitOutput,
	clientContract: string | null | undefined
): InitOutput {
	const negotiated = { ...output };
	if (
		clientContract !== null &&
		clientContract !== undefined &&
		parsePolicyContractHeader(clientContract) !== POLICY_CONTRACT_VERSION
	) {
		negotiated.policyResolution = writePolicyResolutionWire({
			policy: null,
			reason: 'unsupported-contract',
			status: 'failed',
		});
	}
	if (negotiated.policyResolution?.status !== 'matched') {
		delete negotiated.policySnapshotToken;
		delete negotiated.gvl;
		delete negotiated.gvlReference;
		delete negotiated.cmpId;
		delete negotiated.customVendors;
	}
	return negotiated;
};

const isIabMatch = function isIabMatch(
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

/**
 * Resolves one visitor's `/init` from a manifest: the policy, translations
 * and overrides for the inputs, the contract negotiation, the vendor list
 * for an IAB policy, and a detached session report.
 *
 * The init route uses this, and so can a server render that resolves from
 * the same manifest. `resolvedOverrides` and `resolvedPrivacySignals` echo
 * the inputs back, because the resolver's inputs are the only place GPC
 * survives on a server-rendered page.
 *
 * @param options - Manifest, inputs, vendor-list loader, client contract
 * and report target.
 * @returns The resolved init payload, with the vendor list inline.
 * @throws {Error} When `loadGvl` rejects: a vendor list that could not be loaded is
 * a failed resolution, not `gvl: null`, which a client reads as "IAB is
 * off".
 * @example
 * ```ts
 * const init = await resolveConsentInit({ inputs, manifest });
 * ```
 */
export const resolveConsentInit = async function resolveConsentInit(
	options: ResolveConsentInitOptions
): Promise<InitOutput> {
	const { inputs, manifest } = options;
	const payload = negotiateInit(
		resolveManifestInit({ inputs, manifest }),
		options.clientContract
	);
	if (options.loadGvl && isIabMatch(manifest, payload)) {
		payload.gvl = await options.loadGvl(
			payload.translations.language.split('-')[0] || 'en'
		);
	}
	const { report } = options;
	if (report && !report.abandoned?.()) {
		reportConsentSession({
			adapter: report.adapter,
			backendURL: report.backendURL,
			experiment: report.experiment,
			fetch: report.fetch,
			headers: report.headers,
			init: payload,
			inputs,
			journey: report.journey,
			manifest,
			method: report.method,
			source: report.source,
			url: report.url,
			waitUntil: report.waitUntil,
		});
	}
	return payload;
};

/**
 * Reads a platform's `waitUntil` from the object that carries it (Nitro's
 * event, SvelteKit's `platform.context`, Cloudflare's execution context),
 * bound to that object.
 *
 * @param holder - Anything that may have a `waitUntil` method.
 * @returns The bound function, or `undefined` when there is none.
 */
export const readWaitUntil = function readWaitUntil(
	holder: unknown
): ((task: Promise<unknown>) => void) | undefined {
	const waitUntil = (holder as { waitUntil?: unknown } | null | undefined)
		?.waitUntil;
	return typeof waitUntil === 'function'
		? (task) => {
				(waitUntil as (task: Promise<unknown>) => void).call(holder, task);
			}
		: undefined;
};

/** Swallows a promise's outcome, for work handed to the platform. */
const settle = async function settle(task: Promise<unknown>): Promise<void> {
	try {
		await task;
	} catch {
		// The next request retries; the platform only keeps this one alive.
	}
};

/** Hands work to the platform; registration is best effort. */
const keepAlive = function keepAlive(
	waitUntil: ((task: Promise<void>) => void) | undefined,
	task: Promise<unknown>
): void {
	if (!waitUntil) {
		return;
	}
	try {
		waitUntil(settle(task));
	} catch {
		// The work runs either way; it is only unregistered.
	}
};

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

const lastSegment = function lastSegment(pathname: string): string {
	const trimmed = trimPathSlashes(pathname);
	return trimmed.slice(trimmed.lastIndexOf('/') + 1);
};

/**
 * The validated `language` query for the upstream manifest request, or
 * `undefined`. It is the only parameter forwarded: the value keys the
 * shared manifest cache, and a visitor's raw query must neither reach the
 * backend nor mint cache entries.
 */
const readLanguageQuery = function readLanguageQuery(
	url: URL
): string | undefined {
	const raw = url.searchParams.get('language');
	if (!raw) {
		return undefined;
	}
	const language = raw.trim().toLowerCase();
	return LANGUAGE_TAG.test(language) ? `language=${language}` : undefined;
};

/**
 * The budget a server render asked for with
 * {@link CONSENT_ROUTE_TIMEOUT_HEADER}, or `undefined`.
 */
const readTimeoutMs = function readTimeoutMs(
	value: string | null
): number | undefined {
	const trimmed = value?.trim();
	if (!trimmed || !/^\d+$/u.test(trimmed)) {
		return undefined;
	}
	return Math.min(Number.parseInt(trimmed, 10), MAX_ROUTE_TIMEOUT_MS);
};

/**
 * What is left of the request's budget. Every upstream wait (manifest,
 * vendor list, `/init` fallback) fits in the same budget.
 */
const createBudget = function createBudget(budgetMs: number | undefined) {
	const startedAt = Date.now();
	const remaining = (): number | undefined =>
		budgetMs === undefined ? undefined : budgetMs - (Date.now() - startedAt);
	return {
		bound: <Value>(task: Promise<Value>): Promise<Value> =>
			withResolutionBudget(task, remaining()),
		budgetMs,
		expired: (): boolean => {
			const left = remaining();
			return left !== undefined && left <= 0;
		},
		remaining,
	};
};

type Budget = ReturnType<typeof createBudget>;

const isBudgetTimeout = function isBudgetTimeout(error: unknown): boolean {
	return (
		error instanceof ManifestUnavailableError && error.reason === 'timeout'
	);
};

/**
 * Whether a failed manifest read may fall back to backend `/init`: for a
 * backend that has no `/manifest` (404), and for the request that saw a
 * failure first. Not when the budget ran out, and not while the key backs
 * off after a failure, which would put the load the backoff removes back on
 * the same backend.
 */
const canFallBackToInit = function canFallBackToInit(cause: unknown): boolean {
	if (!(cause instanceof ManifestUnavailableError)) {
		return true;
	}
	if (cause.reason === 'timeout') {
		return false;
	}
	return (cause.cause as { status?: unknown } | undefined)?.status === 404;
};

/** A configured URL and the fetch that reaches it. */
interface ResolvedTarget {
	url: string;
	fetch: ManifestFetch | undefined;
}

/** Sends {@link IN_PROCESS_ORIGIN} URLs to `localFetch` as paths. */
const toPathFetch = function toPathFetch(
	localFetch: ManifestFetch
): ManifestFetch {
	return (input, init) => {
		const url = new URL(input instanceof Request ? input.url : input);
		return localFetch(`${url.pathname}${url.search}`, init);
	};
};

/**
 * The hop chain for a proxied request when the adapter supplies none.
 * Without `trustForwardedHeaders` the forwarding headers are
 * client-controlled and a `Request` has no socket address to check them
 * against, so only the request URL is believed and no client IP is sent.
 */
const readRequestForwarding = function readRequestForwarding(
	request: Request,
	trustForwardedHeaders: boolean
): ConsentProxyForwarding {
	const { host, protocol } = new URL(request.url);
	const proto = protocol.slice(0, -1);
	if (!trustForwardedHeaders) {
		return { host, proto };
	}
	// Unmasked on purpose: the WAF needs the real address to rate-limit and
	// score the visitor, and the backend masks before it stores anything.
	const clientIp = getIpAddress(request.headers, { masking: false });
	const chain = (request.headers.get('x-forwarded-for') ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
	if (clientIp && !chain.includes(clientIp)) {
		chain.push(clientIp);
	}
	return {
		for: chain.length > 0 ? chain.join(', ') : undefined,
		host: request.headers.get('x-forwarded-host') ?? host,
		proto: request.headers.get('x-forwarded-proto') ?? proto,
	};
};

const notFound = () => Response.json({ error: 'Not found' }, { status: 404 });

/**
 * Creates the consent route handler an adapter mounts.
 *
 * Nothing is read from the environment, and the configured URLs are
 * resolved per request, so a missing or invalid URL fails the request
 * (the handler throws) rather than the build.
 *
 * @param options - Upstream location, fetch seams, reporting and proxy.
 * @returns One handler for every consent route. Upstream failures reject:
 * a manifest that cannot be read (after the `/init` fallback, when a
 * `backendURL` allows one), a vendor list that cannot be loaded, or a
 * request budget that runs out.
 * @throws {Error} From the handler, when neither `backendURL` nor
 * `manifestURL` is set, or one cannot be resolved.
 * @example
 * ```ts
 * const handle = createConsentRouteHandler({
 *   adapter: '@c15t/example',
 *   backendURL: 'https://consent.example.com',
 * });
 * export const GET = (request: Request) => handle(request, { route: 'init' });
 * ```
 */
export const createConsentRouteHandler = function createConsentRouteHandler(
	options: ConsentRouteHandlerOptions
): ConsentRouteHandler {
	const { adapter } = options;
	const proxy = resolveConsentProxyOptions(options.proxy);
	const extraForwardHeaders =
		typeof options.proxy === 'object'
			? (options.proxy.forwardHeaders ?? []).map((name) => name.toLowerCase())
			: [];
	const trustForwardedHeaders = options.trustForwardedHeaders === true;
	const configuredFetch = function configuredFetch(): typeof globalThis.fetch {
		return (options.fetch ??
			globalThis.fetch.bind(globalThis)) as typeof globalThis.fetch;
	};

	const resolveTarget = function resolveTarget(
		url: string,
		request: Request,
		context: ConsentRouteRequestContext
	): ResolvedTarget | null {
		if (context.localFetch && url.startsWith('/') && !url.startsWith('//')) {
			const resolved = resolveRequestBackendURL(url, {
				requestURL: IN_PROCESS_ORIGIN,
			});
			return resolved
				? { fetch: toPathFetch(context.localFetch), url: resolved }
				: null;
		}
		const resolved = resolveRequestBackendURL(url, {
			headers: request.headers,
			requestURL: request.url,
			trustForwardedHeaders,
		});
		return resolved ? { fetch: options.fetch, url: resolved } : null;
	};

	const resolveBackend = function resolveBackend(
		request: Request,
		context: ConsentRouteRequestContext,
		backendURL: string
	): ResolvedTarget {
		const backend = resolveTarget(backendURL, request, context);
		if (!backend) {
			throw new Error(`${adapter}: invalid backendURL.`);
		}
		return backend;
	};

	const resolveManifestSource = function resolveManifestSource(
		request: Request,
		context: ConsentRouteRequestContext
	): ResolvedTarget {
		if (options.manifestURL) {
			const source = resolveTarget(options.manifestURL, request, context);
			if (!source) {
				throw new Error(`${adapter}: invalid manifestURL.`);
			}
			return source;
		}
		if (!options.backendURL) {
			throw new Error(`${adapter}: pass backendURL or manifestURL.`);
		}
		const backend = resolveBackend(request, context, options.backendURL);
		return { ...backend, url: `${backend.url}/manifest` };
	};

	/**
	 * Credentials for the manifest request when the proxy is on: the cookies
	 * `cookieNames` names and the extra `forwardHeaders`, so a backend that
	 * gates `/manifest` on them still serves it. Hop-chain headers are never
	 * copied from the browser. Nothing identity-bearing crosses cleartext.
	 */
	const manifestCredentials = function manifestCredentials(
		request: Request,
		sourceURL: string
	): Record<string, string> | undefined {
		if (!proxy) {
			return undefined;
		}
		const headers: Record<string, string> = {};
		const cookie = request.headers.get('cookie');
		const scoped =
			cookie && proxy.cookieNames
				? filterCookieHeader(cookie, proxy.cookieNames)
				: undefined;
		if (scoped) {
			headers.cookie = scoped;
		}
		for (const name of extraForwardHeaders) {
			if (name === 'cookie' || CONSENT_PROXY_FORWARDING_HEADERS.has(name)) {
				continue;
			}
			const value = request.headers.get(name);
			if (value) {
				headers[name] = value;
			}
		}
		return stripIdentityForCleartext(
			Object.keys(headers).length > 0 ? headers : undefined,
			sourceURL
		);
	};

	const readManifest = async function readManifest(
		request: Request,
		context: ConsentRouteRequestContext,
		source: ResolvedTarget,
		budget: Budget | undefined,
		query: string | undefined
	): Promise<{
		cached: CachedManifestResponse;
		credentials: Record<string, string> | undefined;
	}> {
		const credentials = manifestCredentials(request, source.url);
		const cached = await fetchCachedManifest({
			cache: options.cache,
			fetch: source.fetch,
			headers: credentials,
			init: options.manifestFetchInit,
			onBackgroundRevalidate: context.waitUntil,
			query,
			sourceURL: source.url,
			timeoutMs: budget?.remaining(),
		});
		return { cached, credentials };
	};

	const serveManifest = async function serveManifest(
		request: Request,
		url: URL,
		context: ConsentRouteRequestContext
	): Promise<Response> {
		if (options.manifest) {
			return Response.json(options.manifest);
		}
		const { cached, credentials } = await readManifest(
			request,
			context,
			resolveManifestSource(request, context),
			undefined,
			readLanguageQuery(url)
		);
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
			return new Response(JSON.stringify(cached.manifest), { headers });
		}
		// Downstream caches count the remaining lifetime, not a fresh TTL.
		headers.set('age', String(getManifestAge(cached)));
		const { etag } = cached.headers;
		if (etag && request.headers.get('if-none-match') === etag) {
			return new Response(null, { headers, status: 304 });
		}
		return new Response(JSON.stringify(cached.manifest), { headers });
	};

	const createGvlLoader = function createGvlLoader(
		manifest: ConsentManifest,
		budget: Budget,
		context: ConsentRouteRequestContext
	): (language: string) => Promise<GlobalVendorList | null> {
		const reference = manifest.iab?.gvl;
		return async function loadGvl(language) {
			if (!reference) {
				return null;
			}
			const fill = options.fetchGvl
				? options.fetchGvl({ fetch: configuredFetch(), language, reference })
				: fetchCachedGvl({
						fetch: options.fetch,
						headers: c15tProtocolHeaders,
						label: adapter,
						language,
						url: reference.url,
					});
			if (budget.budgetMs === undefined) {
				return await fill;
			}
			try {
				return await budget.bound(fill);
			} catch (error) {
				if (isBudgetTimeout(error)) {
					// Let the list finish filling the cache for the next request.
					keepAlive(context.waitUntil, fill);
				}
				throw error;
			}
		};
	};

	const initHeaders = {
		'cache-control': INIT_CACHE_CONTROL,
		[POLICY_CONTRACT_HEADER]: String(POLICY_CONTRACT_VERSION),
	};

	/**
	 * Older backends may not expose `/manifest`: ask the backend's own
	 * `GET /init`, forwarding only the consent request headers (geo,
	 * language, GPC) and the browser's consent journey, and rebuild the canonical output from its answer so
	 * unknown upstream fields cannot carry stale policy evidence.
	 */
	const fallBackToBackendInit = async function fallBackToBackendInit(
		request: Request,
		context: ConsentRouteRequestContext,
		budget: Budget,
		cause: unknown
	): Promise<Response> {
		if (!options.backendURL || options.manifest || !canFallBackToInit(cause)) {
			throw cause;
		}
		if (budget.expired()) {
			throw new ManifestUnavailableError(
				'timeout',
				`c15t: consent resolution did not finish within ${budget.budgetMs} ms.`,
				{ cause }
			);
		}
		const backend = resolveBackend(request, context, options.backendURL);
		const forward: Record<string, string> = { ...c15tProtocolHeaders };
		for (const name of CONSENT_REQUEST_HEADER_NAMES) {
			const value = request.headers.get(name);
			if (value) {
				forward[name] = value;
			}
		}
		// The backend's own session report then carries the journey, with
		// the page's origin: a server fetch sends no Origin of its own, and
		// the backend's host is not the site's.
		const journey = readJourneyParams(request.url);
		if (journey) {
			const origin = request.headers.get('origin');
			forward.origin =
				origin && origin !== 'null' ? origin : new URL(request.url).origin;
		}
		const init: RequestInit = { headers: forward };
		const left = budget.remaining();
		if (left !== undefined) {
			// Cancels a real request; the race below covers an in-process
			// fetch that drops the signal.
			init.signal = AbortSignal.timeout(Math.max(0, left));
		}
		const fetchImpl = backend.fetch ?? configuredFetch();
		const { payload, response } = await budget.bound(
			(async () => {
				const upstream = await fetchImpl(
					journey
						? appendJourneyParams(`${backend.url}/init`, journey)
						: `${backend.url}/init`,
					init
				);
				if (!upstream.ok) {
					throw cause;
				}
				return {
					payload: (await upstream.json()) as InitOutput,
					response: upstream,
				};
			})()
		);
		const mapped = mapInitOutputToInitResponse(payload, forward, {
			producerContract: readProducerPolicyContract(response.headers),
		});
		const output: InitOutput = {
			branding: payload.branding,
			cmpId: mapped.cmpId,
			customVendors: mapped.customVendors,
			gvl: mapped.gvl,
			gvlReference: mapped.gvlReference,
			hosting: mapped.hosting,
			location: payload.location,
			policyResolution: writePolicyResolutionWire(
				readPolicyResolutionWire(mapped.policyResolution)
			),
			policySnapshotToken: mapped.policySnapshotToken,
			resolvedPrivacySignals: mapped.resolvedPrivacySignals,
			subjectId: mapped.subjectId,
			translations: payload.translations,
			vendorListVersion: mapped.vendorListVersion,
			vendors: mapped.vendors,
		} as InitOutput;
		return Response.json(
			negotiateInit(output, request.headers.get(POLICY_CONTRACT_HEADER)),
			{ headers: initHeaders }
		);
	};

	const serveInit = async function serveInit(
		request: Request,
		url: URL,
		context: ConsentRouteRequestContext
	): Promise<Response> {
		const budget = createBudget(
			readTimeoutMs(request.headers.get(CONSENT_ROUTE_TIMEOUT_HEADER))
		);
		let manifest: ConsentManifest;
		if (options.manifest) {
			({ manifest } = options);
		} else {
			// Outside the fallback: a misconfigured source is an error, not a
			// reason to ask the backend's `/init` instead.
			const source = resolveManifestSource(request, context);
			try {
				({
					cached: { manifest },
				} = await readManifest(request, context, source, budget, undefined));
			} catch (cause) {
				return await fallBackToBackendInit(request, context, budget, cause);
			}
		}
		const loadGvl = createGvlLoader(manifest, budget, context);
		const listResponse = await serveGvlReference(request, loadGvl);
		if (listResponse) {
			return listResponse;
		}
		const inputs = context.inputs
			? { ...context.inputs, language: context.inputs.language ?? 'en' }
			: getResolverInputsFromHeaders(request.headers);
		const payload = await resolveConsentInit({
			clientContract: request.headers.get(POLICY_CONTRACT_HEADER),
			inputs,
			loadGvl,
			manifest,
			report:
				options.reportSessions === false
					? undefined
					: {
							// A request that went away is a render that stopped
							// waiting; the browser inits again and reports the view.
							abandoned: () => request.signal.aborted,
							adapter,
							backendURL: options.backendURL,
							fetch: options.fetch as typeof globalThis.fetch | undefined,
							headers: request.headers,
							method: request.method,
							source: 'route',
							url: request.url,
							waitUntil: context.waitUntil,
						},
		});
		return Response.json(deferInitGvlToRoute(payload, url.pathname), {
			headers: initHeaders,
		});
	};

	const serveProxy = function serveProxy(
		request: Request,
		context: ConsentRouteRequestContext,
		path: string
	): Promise<Response> {
		if (!proxy) {
			return Promise.resolve(notFound());
		}
		if (!options.backendURL) {
			throw new Error(`${adapter}: pass backendURL to use proxy.`);
		}
		const backend = resolveBackend(request, context, options.backendURL);
		return forwardConsentRequest({
			adapter,
			backendURL: backend.url,
			fetch: backend.fetch as typeof globalThis.fetch | undefined,
			forwarding: context.forwarding
				? context.forwarding()
				: readRequestForwarding(request, trustForwardedHeaders),
			options: proxy,
			path,
			request,
		});
	};

	const dispatch = function dispatch(
		request: Request,
		context: ConsentRouteRequestContext
	): Promise<Response> {
		const url = new URL(request.url);
		const path =
			context.path === undefined
				? lastSegment(url.pathname)
				: trimPathSlashes(context.path);
		let { route } = context;
		if (route === undefined) {
			const method = request.method.toUpperCase();
			const readable = method === 'GET' || method === 'HEAD';
			if (readable && path === 'manifest') {
				route = 'manifest';
			} else if (
				readable &&
				(context.path === undefined || path === '' || path === 'init')
			) {
				route = 'init';
			} else {
				route = 'proxy';
			}
		}
		switch (route) {
			case 'manifest':
				return serveManifest(request, url, context);
			case 'init':
				return serveInit(request, url, context);
			default:
				return serveProxy(request, context, path);
		}
	};

	return async (request, context = {}) => {
		const work = dispatch(request, context);
		const { waitUntil } = context;
		if (!waitUntil) {
			return await work;
		}
		// A client that goes away (a server render out of budget, a closed
		// tab) stops waiting; edge runtimes would then drop a cold manifest
		// fill the next request needs, so the rest goes to the platform.
		const { signal } = request;
		const onAbort = () => keepAlive(waitUntil, work);
		signal.addEventListener('abort', onAbort, { once: true });
		try {
			return await work;
		} finally {
			signal.removeEventListener('abort', onAbort);
		}
	};
};
