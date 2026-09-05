/**
 * `@c15t/nextjs/server` server-only helpers.
 *
 * Reads the incoming Next.js request (cookies + headers via next/headers)
 * and produces a JSON-serializable `KernelConfig`. The Server Component
 * awaits this and passes it as a plain prop to the client `ConsentBoundary`.
 *
 * Server Components await `readInitialConsentConfig()` and pass its plain data
 * to `<ConsentBoundary config={...}>`. The client boundary creates one kernel
 * per mount, so concurrent requests do not share runtime state.
 *
 * This file imports `next/headers` and must only be called in a Server
 * Component or route handler. It is NOT marked `'use server'` because it
 * is a plain async function, not an action.
 */

import {
	mergeInitOutputIntoKernelConfig,
	mergeInitResponseIntoKernelConfig,
} from '@c15t/core';
import type { KernelConfig, KernelOverrides } from '@c15t/core';
import { readStoredConsentFromCookie } from '@c15t/core/modules/persistence';
import { createManifestTransport } from '@c15t/core/transports/manifest';
import { resolveBackendURL } from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';
import { baseTranslations } from '@c15t/translations/all';

import type { ConsentConfig } from './config';
import {
	consentInputsToOverrides,
	extractConsentRequestInputs,
} from './headers';

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
 * const config = await readInitialConsentConfig({
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
		const nextHeaders = await import('next/headers.js');
		return (await nextHeaders.headers()) as Headers;
	},
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
 * Derive a `KernelConfig` from the current Next.js request.
 *
 * What it reads:
 * - Cookie, defaulting to `c15t`, read with the persistence parser.
 * - `x-vercel-ip-country`, `cf-ipcountry`, or `x-country` for geo.
 * - `x-vercel-ip-country-region` or `cf-region-code` for region.
 * - The first `accept-language` entry for language.
 *
 * What it does NOT do:
 * - Does not fetch from the backend. Banner info / translations come from
 *   boot modules once the client kernel mounts.
 * - Does not set cookies. Writes happen client-side via the persistence
 *   boot module.
 * - Does not cache across requests. Each call reads fresh headers, so
 *   Fluid Compute concurrent requests stay isolated.
 */
export const readInitialConsentConfig = async function readInitialConsentConfig(
	options: ReadInitialConsentConfigOptions = {}
): Promise<KernelConfig> {
	const request = options.request ?? defaultNextRequestContext;
	const headerStore = await request.headers();

	// The persistence module writes the `c15t` cookie in a compact format.
	// Read it with the same shared parser the client uses,
	// so the server sees exactly what the client persisted (returning
	// visitors must not get the banner re-rendered into the first HTML).
	// `cookieName` only matters if the consumer customized
	// `storageConfig.storageKey` client-side.
	const cookieHeader = (headerStore as Headers).get?.('cookie') ?? undefined;
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

	const inputs = extractConsentRequestInputs(headerStore as Headers, {
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
	if (inputs.gpc !== undefined) {
		overrides.gpc = inputs.gpc;
	}

	const config: KernelConfig = {};
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
 * Type alias re-exported so consumers can stay within `@c15t/nextjs`.
 */
export type { KernelConfig } from '@c15t/core';
export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';

// -- Optional: server-side prefetch of the init roundtrip -------------------

export interface PrefetchInitialConsentOptions extends ReadInitialConsentConfigOptions {
	/**
	 * Backend base URL. The helper calls `${backendURL}/init` server-side and
	 * folds the response into the returned prefetch config (policy, UI,
	 * translations, IAB metadata, and consents if the backend knows the
	 * user). This avoids a first-paint flicker before the client-side init
	 * lands.
	 *
	 * Relative URLs are resolved via the request headers (`x-forwarded-proto`,
	 * `host`) so the backend call works under any reverse-proxy.
	 *
	 * Required unless `config` supplies it; overrides `config.backendURL`.
	 */
	backendURL?: string;

	/**
	 * A `defineConsentConfig` result. Supplies `backendURL` and `manifestURL`
	 * defaults; the explicit fields on this options bag win.
	 */
	config?: ConsentConfig;

	/**
	 * Same-origin or absolute `GET /manifest` URL. When set, prefetch resolves
	 * init locally from the cached manifest and does not call `/init`.
	 * Overrides `config.manifestURL`.
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
	 * returns the baseline config so the page renders and the client
	 * retries on mount. When omitted, the failure is logged with
	 * `console.warn` outside production so it does not go unnoticed.
	 */
	onError?: (error: unknown) => void;
}

const isProduction = function isProduction(): boolean {
	const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
		.process?.env?.NODE_ENV;
	return nodeEnv === 'production';
};

const reportPrefetchError = function reportPrefetchError(
	options: PrefetchInitialConsentOptions,
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
		`[c15t] prefetchInitialConsent: request to ${url} failed (${message}); rendering with the baseline config and letting the client retry.`
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

const fetchHostedInit = async function fetchHostedInit(input: {
	backendURL: string;
	fetch?: typeof globalThis.fetch;
	headers: Record<string, string>;
}): Promise<InitOutput> {
	const fetchImpl = input.fetch ?? globalThis.fetch?.bind(globalThis);
	if (!fetchImpl) {
		throw new Error('prefetchInitialConsent: no fetch available.');
	}
	const response = await fetchImpl(`${input.backendURL}/init`, {
		cache: 'no-store',
		credentials: 'include',
		headers: {
			accept: 'application/json',
			...input.headers,
		},
		method: 'GET',
	});
	if (!response.ok) {
		throw new Error(
			`prefetchInitialConsent: /init responded ${response.status} ${response.statusText}`
		);
	}
	return (await response.json()) as InitOutput;
};

const prefetchFromManifest = async function prefetchFromManifest(input: {
	absoluteBackend: string;
	absoluteManifest: string | null | undefined;
	base: KernelConfig;
	forward: Record<string, string>;
	options: PrefetchInitialConsentOptions;
	requestHeaders: Headers;
}): Promise<KernelConfig> {
	const { absoluteBackend, absoluteManifest, base, options } = input;
	const manifestInputs = extractConsentRequestInputs(input.requestHeaders, {
		country: options.country,
		language: options.language,
	});
	const transport = createManifestTransport({
		backendURL: absoluteBackend,
		baseTranslations,
		fetch: options.fetch,
		headers: input.forward,
		inputs: manifestInputs,
		manifest: options.manifest,
		manifestURL: absoluteManifest ?? undefined,
	});

	try {
		const response = await transport.init?.({
			overrides: {
				...(base.initialOverrides ?? {}),
				...consentInputsToOverrides(manifestInputs),
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
 * Server-side consent prefetch.
 *
 * 1. Reads cookies + geo headers like `readInitialConsentConfig`.
 * 2. Calls `${backendURL}/init` server-side with the request context, or
 *    resolves init from the cached manifest when `manifestURL` is set.
 * 3. Folds the response into a `KernelConfig` so first paint is correct
 *    without waiting for a client roundtrip.
 *
 * If the backend call fails, returns the baseline config so the page still
 * renders and the client boundary retries on mount. The failure reaches
 * `onError` when provided, and is otherwise logged outside production.
 *
 * @throws {Error} When neither `backendURL` nor `config` is given.
 * @example
 * ```ts
 * import { prefetchInitialConsent } from '@c15t/nextjs/server';
 * import { consentConfig } from '@/consent.config';
 *
 * const config = await prefetchInitialConsent({ config: consentConfig });
 * ```
 */
export const prefetchInitialConsent = async function prefetchInitialConsent(
	options: PrefetchInitialConsentOptions
): Promise<KernelConfig> {
	const backendURL = options.backendURL ?? options.config?.backendURL;
	if (!backendURL) {
		throw new Error(
			'@c15t/nextjs: prefetchInitialConsent needs `backendURL` or a `config` from defineConsentConfig().'
		);
	}
	const manifestURL = options.manifestURL ?? options.config?.manifestURL;

	const base = await readInitialConsentConfig(options);
	const request = options.request ?? defaultNextRequestContext;
	const requestHeaders = await request.headers();
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
		return await prefetchFromManifest({
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
			fetch: options.fetch,
			headers: {
				...forward,
				...createInitHeadersFromOverrides(base.initialOverrides ?? {}),
			},
		});
		return mergeInitOutputIntoKernelConfig(base, response);
	} catch (error) {
		reportPrefetchError(options, `${absoluteBackend}/init`, error);
		return base;
	}
};
