import {
	deferInitGvl,
	mergeInitResponseIntoKernelConfig,
	c15tProtocolHeaders,
	mapInitOutputToInitResponse,
} from '@c15t/core';
import type { KernelOverrides } from '@c15t/core';
/**
 * `@c15t/nextjs/server` server-only helpers.
 *
 * `resolveConsent()` reads the incoming Next.js request (cookies + headers
 * via `next/headers`), optionally asks the backend or the cached manifest
 * for the visitor's policy, and produces a JSON-serializable `ConsentState`.
 * A Server Component passes it as a plain prop to the client `ConsentRoot`,
 * which creates one kernel per mount so concurrent requests do not share
 * runtime state.
 *
 * This file imports `next/headers` and must only be called in a Server
 * Component or route handler. It is NOT marked `'use server'` because it
 * is a plain async function, not an action.
 */
import { readStoredRecordsFromCookieHeader } from '@c15t/core/modules/persistence';
import { readProducerPolicyContract } from '@c15t/core/transports';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import type { InitOutput } from '@c15t/schema/types';
import { resolveBackendURL } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import type { ConsentConfig } from './config';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from './headers';
import type { ConsentState } from './types';

type Awaitable<Value> = Promise<Value> | Value;

/**
 * Request context the server helpers read from.
 *
 * The default implementation calls `next/headers`, which only exists in the
 * App Router. Pass your own when the request arrives another way, such as
 * `getServerSideProps` in the Pages Router (see `@c15t/nextjs/pages`, which
 * builds this adapter for you) or a test harness.
 *
 * @example
 * ```ts
 * const state = await resolveConsent({
 * 	request: {
 * 		cookies: () => ({ toString: () => req.headers.cookie ?? '' }),
 * 		headers: () => new Headers({ host: req.headers.host ?? '' }),
 * 	},
 * });
 * ```
 */
export interface NextRequestContext {
	/**
	 * Returns the request cookies. Only `toString()` is read; it must
	 * serialize to a `Cookie` header value (`a=1; b=2`).
	 */
	cookies: () => Awaitable<{ toString: () => string }>;

	/**
	 * Returns the request headers as a Web `Headers` instance.
	 */
	headers: () => Awaitable<Headers>;
}

const defaultNextRequestContext: NextRequestContext = {
	async cookies() {
		const nextHeaders = await import('next/headers.js');
		return nextHeaders.cookies();
	},
	async headers() {
		const [nextHeaders, nextServer] = await Promise.all([
			import('next/headers.js'),
			import('next/server.js'),
		]);
		// Consent depends on the request clock, which Next forbids in a
		// runtime prefetch (`partialPrefetching`). `connection()` marks this
		// work request-time: it hangs in prerenders and resolves at once in
		// real requests.
		await nextServer.connection?.();
		return (await nextHeaders.headers()) as Headers;
	},
};

/**
 * How the request is read: the clock, the consent cookie, header
 * overrides, and the adapter that exposes the request itself.
 */
export interface ConsentRequestOptions {
	/** Request clock reused for record validation and hydration. */
	now?: number;
	/**
	 * Cookie name holding persisted consent. Defaults to `c15t`, the
	 * persistence module's storage key. Set this only if you customized
	 * `storageConfig.storageKey` client-side; it must match.
	 */
	cookieName?: string;

	/**
	 * If provided, override the auto-detected country from request headers.
	 * Mainly useful for tests.
	 */
	country?: string;

	/**
	 * If provided, override the auto-detected language.
	 */
	language?: string;

	/**
	 * Request context adapter. Defaults to `next/headers`, so set this
	 * wherever that module is unavailable: the Pages Router, custom
	 * servers, or tests. `@c15t/nextjs/pages` derives it from the Node
	 * request for you.
	 */
	request?: NextRequestContext;
}

/**
 * The request-only part of `resolveConsent()`: the visitor's state from
 * cookies and headers alone, before any backend or manifest call.
 *
 * What it reads:
 * - Cookie, defaulting to `c15t`, read with the persistence parser.
 * - `x-vercel-ip-country`, `cf-ipcountry`, or `x-country` for geo.
 * - `x-vercel-ip-country-region` or `cf-region-code` for region.
 * - The first `accept-language` entry for language.
 *
 * Reads the clock only after the caller awaited `request.headers()`, so the
 * default App Router context has already marked the work request-time.
 */
const readConsentRequest = async function readConsentRequest(
	options: ConsentRequestOptions,
	request: NextRequestContext,
	headerStore: Headers
): Promise<ConsentState> {
	const now = options.now ?? Date.now();
	const cookieHeader =
		headerStore.get('cookie') ?? (await request.cookies()).toString();
	const initialRecords = readStoredRecordsFromCookieHeader(
		cookieHeader,
		options.cookieName ? { storageKey: options.cookieName } : undefined,
		now
	);

	const inputs = extractConsentRequestInputs(headerStore, {
		country: options.country,
		language: options.language,
	});

	const overrides: KernelOverrides = {};
	if (inputs.country) {
		overrides.country = inputs.country;
	}
	if (inputs.region) {
		overrides.region = inputs.region;
	}
	if (inputs.language) {
		overrides.language = inputs.language;
	}
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
 * Type alias re-exported so consumers can stay within `@c15t/nextjs`.
 */
export type { KernelConfig } from '@c15t/core';
export type { ConsentState } from './types';
export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';

// -- Optional: server-side prefetch of the init roundtrip -------------------

export interface ResolveConsentOptions extends ConsentRequestOptions {
	/**
	 * Backend base URL. When set (here or through `config`), the helper
	 * calls `${backendURL}/init` server-side and folds the response into the
	 * returned state (policy, UI, translations, IAB metadata, and consents
	 * if the backend knows the user). This avoids a first-paint flicker
	 * before the client-side init lands.
	 *
	 * Relative URLs are resolved via the request headers (`x-forwarded-proto`,
	 * `host`) so the backend call works under any reverse-proxy.
	 *
	 * Without a backend URL the helper returns the cookie- and header-only
	 * state and performs no network call. Overrides `config.backendURL`.
	 */
	backendURL?: string;

	/**
	 * A `defineConsentConfig` result. Supplies `backendURL` and `manifestURL`
	 * defaults; the explicit fields on this options bag win.
	 */
	config?: ConsentConfig;

	/**
	 * Same-origin or absolute `GET /manifest` URL. When set, the helper
	 * resolves init locally from the cached manifest and does not call
	 * `/init`. Overrides `config.manifestURL`.
	 */
	manifestURL?: string;

	/**
	 * Inline manifest for hosts that already loaded it. Takes precedence over
	 * `manifestURL` and keeps the request path backend-free.
	 */
	manifest?: Parameters<typeof createManifestTransport>[0]['manifest'];

	/**
	 * Override fetch. Useful for testing or for wiring Vercel's
	 * unstable_cache / Next.js `fetch`-level caching around the call.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Forward additional request headers onto the backend call. Cookies,
	 * `x-forwarded-for`, and `user-agent` from the incoming request are
	 * forwarded automatically (see {@link DEFAULT_FORWARD_HEADERS}). Use this for
	 * authentication tokens or custom tracing headers.
	 */
	forwardHeaders?: string[];

	/**
	 * Called when the backend or manifest request fails. The helper still
	 * returns the request-only state so the page renders and the client
	 * retries on mount. When omitted, the failure is logged with
	 * `console.warn` outside production so it does not go unnoticed.
	 */
	onError?: (error: unknown) => void;

	/**
	 * Report the init this render resolved from the manifest to the
	 * backend's `POST /sessions`, server-to-server and detached from the
	 * render, so the backend still counts visitors it never served `/init`
	 * to. Only the manifest path reports; a hosted `/init` call is already
	 * the backend's own signal. Set `false` to send none.
	 *
	 * @default true
	 */
	reportSessions?: boolean;

	/**
	 * Receives the session report's promise so it survives the response on
	 * runtimes that stop detached work once a response is sent. In the App
	 * Router pass `after` from `next/server`: `(task) => after(() => task)`.
	 * The promise never rejects.
	 */
	waitUntil?: (task: Promise<void>) => void;
}

const isProduction = function isProduction(): boolean {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	return nodeEnv === 'production';
};

const reportPrefetchError = function reportPrefetchError(
	options: ResolveConsentOptions,
	url: string,
	error: unknown
): void {
	if (options.onError) {
		options.onError(error);
		return;
	}
	if (isProduction()) {
		return;
	}
	const message = error instanceof Error ? error.message : String(error);
	console.warn(
		`[c15t] resolveConsent: request to ${url} failed (${message}); rendering with the request-only state and letting the client retry.`
	);
};

const createInitHeadersFromOverrides = function createInitHeadersFromOverrides(
	overrides: Readonly<KernelOverrides>
): Record<string, string> {
	const headersLocal: Record<string, string> = {};
	if (overrides.country) {
		headersLocal['x-c15t-country'] = overrides.country;
	}
	if (overrides.region) {
		headersLocal['x-c15t-region'] = overrides.region;
	}
	if (overrides.language) {
		headersLocal['accept-language'] = overrides.language;
	}
	if (overrides.gpc !== undefined) {
		headersLocal['sec-gpc'] = overrides.gpc ? '1' : '0';
	}
	return headersLocal;
};

/**
 * Headers forwarded onto the backend call: the incoming cookies plus any
 * explicitly requested request headers.
 */
const pickRequestHeaders = function pickRequestHeaders(
	requestHeaders: Headers,
	names: readonly string[] | undefined
): Record<string, string> {
	const picked: Record<string, string> = {};
	for (const name of names ?? []) {
		const value = requestHeaders.get(name);
		if (value) {
			picked[name.toLowerCase()] = value;
		}
	}
	return picked;
};

/**
 * Request headers forwarded to the backend on every server-side `/init`.
 *
 * The backend geolocates from the client IP when no CDN geo header is
 * present, and records the user agent with the consent decision, so both
 * have to travel with a server-initiated call the way they do with a
 * browser-initiated one. `forwardHeaders` adds to this list.
 */
export const DEFAULT_FORWARD_HEADERS = [
	'x-forwarded-for',
	'user-agent',
] as const;

const createForwardHeaders = function createForwardHeaders(
	cookieHeader: string,
	requestHeaders: Headers,
	forwardHeaders: readonly string[] | undefined
): Record<string, string> {
	const forward: Record<string, string> = {};
	if (cookieHeader) {
		forward.cookie = cookieHeader;
	}
	for (const key of [...DEFAULT_FORWARD_HEADERS, ...(forwardHeaders ?? [])]) {
		const value = requestHeaders.get(key);
		if (value) {
			forward[key.toLowerCase()] = value;
		}
	}
	return forward;
};

const canDeferHostedGvl = (
	options: ResolveConsentOptions,
	forward: Record<string, string>,
	requestHeaders: Headers
): boolean =>
	!options.fetch &&
	!forward.cookie &&
	!options.forwardHeaders?.some((name) => requestHeaders.has(name));

const fetchHostedInit = async function fetchHostedInit(input: {
	backendURL: string;
	fetch?: typeof globalThis.fetch;
	headers: Record<string, string>;
	deferGvl: boolean;
}): Promise<ReturnType<typeof mapInitOutputToInitResponse>> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('resolveConsent: no fetch available.');
	}
	const response = await fetchImpl(`${input.backendURL}/init`, {
		cache: 'no-store',
		credentials: 'include',
		headers: {
			accept: 'application/json',
			...c15tProtocolHeaders,
			...input.headers,
		},
		method: 'GET',
	});
	if (!response.ok) {
		throw new Error(
			`resolveConsent: /init responded ${response.status} ${response.statusText}`
		);
	}
	const payload: InitOutput = await response.json();
	return mapInitOutputToInitResponse(
		input.deferGvl
			? deferInitGvl(payload, `${input.backendURL}/init`, 'init', input.headers)
			: payload,
		input.headers,
		{
			producerContract: readProducerPolicyContract(response.headers),
		}
	);
};

const resolveFromManifest = async function resolveFromManifest(input: {
	absoluteBackend: string;
	absoluteManifest: string | null | undefined;
	base: ConsentState;
	forward: Record<string, string>;
	options: ResolveConsentOptions;
	requestHeaders: Headers;
}): Promise<ConsentState> {
	const { absoluteBackend, absoluteManifest, base, options } = input;
	const manifestInputs = extractConsentRequestInputs(input.requestHeaders, {
		country: options.country,
		language: options.language,
	});
	const deferGvl = !options.fetch && Object.keys(input.forward).length === 0;
	const transport = createManifestTransport({
		backendURL: absoluteBackend,
		baseTranslations,
		deferGvl,
		fetch: options.fetch,
		gvlRoute: deferGvl ? options.config?.initURL : undefined,
		headers: input.forward,
		inputs: manifestInputs,
		manifest: options.manifest,
		manifestURL: absoluteManifest ?? undefined,
		report:
			options.reportSessions === false
				? undefined
				: {
						adapter: '@c15t/nextjs',
						headers: input.requestHeaders,
						source: 'render',
						waitUntil: options.waitUntil,
					},
	});

	try {
		const response = await transport.init?.({
			overrides: {
				...(base.initialOverrides ?? {}),
				...consentInputsToOverrides({ ...manifestInputs, gpc: undefined }),
			},
			user: base.initialUser ?? null,
		});
		if (!response) {
			return base;
		}
		return mergeInitResponseIntoKernelConfig(base, response);
	} catch (error) {
		reportPrefetchError(
			options,
			absoluteManifest ?? `${absoluteBackend}/manifest`,
			error
		);
		return base;
	}
};

/**
 * Resolve the visitor's consent state for the current request.
 *
 * 1. Reads the consent cookie, geo headers, language, and GPC from the
 *    request.
 * 2. With a backend URL (`backendURL` or `config.backendURL`), calls
 *    `${backendURL}/init` server-side with the request context, or resolves
 *    init from the cached manifest when `manifest` or `manifestURL` is set.
 * 3. Folds the response into a `ConsentState` so first paint is correct
 *    without waiting for a client roundtrip.
 *
 * Without a backend URL, step 2 is skipped and the request-only state is
 * returned with no network call. If the backend call fails, the request-only
 * state is returned too, so the page still renders and `ConsentRoot` retries
 * on mount. The failure reaches `onError` when provided, and is otherwise
 * logged outside production.
 *
 * Each call reads fresh headers and never caches across requests, so
 * concurrent requests stay isolated.
 *
 * @param options - Backend URL or a `defineConsentConfig` result, the
 * manifest source, fetch overrides, and how to read the request
 * @returns The visitor's JSON-serializable state for `ConsentRoot`
 * @example
 * ```ts
 * import { resolveConsent } from '@c15t/nextjs/server';
 * import { consentConfig } from '@/consent.config';
 *
 * const state = await resolveConsent({ config: consentConfig });
 * ```
 */
export const resolveConsent = async function resolveConsent(
	options: ResolveConsentOptions = {}
): Promise<ConsentState> {
	const request = options.request ?? defaultNextRequestContext;
	const requestHeaders = await request.headers();
	const base = await readConsentRequest(options, request, requestHeaders);

	const backendURL = options.backendURL ?? options.config?.backendURL;
	if (!backendURL) {
		return base;
	}
	const manifestURL = options.manifestURL ?? options.config?.manifestURL;
	const requestCookies = await request.cookies();

	const absoluteBackend = resolveBackendURL(backendURL, requestHeaders);
	if (!absoluteBackend) {
		reportPrefetchError(
			options,
			backendURL,
			new Error(
				'backendURL could not be resolved from the request headers; pass an absolute URL or make sure host/x-forwarded-* reach the server.'
			)
		);
		return base;
	}
	const absoluteManifest = manifestURL
		? resolveBackendURL(manifestURL, requestHeaders)
		: undefined;
	if (manifestURL && !absoluteManifest) {
		reportPrefetchError(
			options,
			manifestURL,
			new Error(
				'manifestURL could not be resolved from the request headers; pass an absolute URL or make sure host/x-forwarded-* reach the server.'
			)
		);
		return base;
	}

	if (options.manifest || absoluteManifest) {
		// The manifest is public policy data, so the fetch carries only the
		// headers the caller asked for: no cookies, client IP, or user agent.
		return await resolveFromManifest({
			absoluteBackend,
			absoluteManifest,
			base,
			forward: pickRequestHeaders(requestHeaders, options.forwardHeaders),
			options,
			requestHeaders,
		});
	}

	const forward = createForwardHeaders(
		requestCookies.toString(),
		requestHeaders,
		options.forwardHeaders
	);

	try {
		const response = await fetchHostedInit({
			backendURL: absoluteBackend,
			// A browser reference cannot replay private server credentials or a
			// custom fetch implementation. Preserve the fetched list in that case.
			deferGvl: canDeferHostedGvl(options, forward, requestHeaders),
			fetch: options.fetch,
			headers: {
				...forward,
				...createInitHeadersFromOverrides(base.initialOverrides ?? {}),
				'sec-gpc': base.initialPrivacySignals?.gpc ? '1' : '0',
			},
		});
		return mergeInitResponseIntoKernelConfig(base, response);
	} catch (error) {
		reportPrefetchError(options, `${absoluteBackend}/init`, error);
		return base;
	}
};
