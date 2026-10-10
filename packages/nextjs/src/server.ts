/**
 * `@c15t/nextjs/server` server-only helpers.
 *
 * `resolveConsent()` reads the incoming Next.js request (cookies + headers
 * via `next/headers`) and hands the facts to `resolveRequestConsent` from
 * `@c15t/core/server`, which owns the request read, the policy prefetch, the
 * forwarding rule, the budget and the merge. A Server Component passes the
 * result as a plain prop to the client `ConsentRoot`, which creates one
 * kernel per mount so concurrent requests do not share runtime state.
 *
 * This file imports `next/headers` and must only be called in a Server
 * Component or route handler. It is NOT marked `'use server'` because it
 * is a plain async function, not an action.
 */
import type { ConsentJourneyOption, ServerExperiment } from '@c15t/core';
import { resolveRequestConsent } from '@c15t/core/server';
import * as React from 'react';

import { createManifestFetchInit } from './api';
import type { ConsentSourceOptions } from './consent-source';
import { resolveConsentSource } from './consent-source';
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

/** The request facts the core resolver needs. */
interface NextRequestFacts {
	headers: Headers;
	cookie: string;
}

/**
 * React's per-request memo. A namespace read, so React 18 (Pages Router),
 * which has no `cache`, gets the read unmemoized instead of a link error.
 */
const memoize: <Read extends () => Promise<NextRequestFacts>>(
	read: Read
) => Read =
	(React as { cache?: <Read>(read: Read) => Read }).cache ?? ((read) => read);

/**
 * Reads the App Router request once per render. `cache()` shares the read
 * between a layout and a page that both resolve consent.
 *
 * Consent depends on the request clock, which Next forbids in a runtime
 * prefetch (`partialPrefetching`). `connection()` marks this work
 * request-time: it hangs in prerenders and resolves at once in real
 * requests, so a prerendered page never carries one visitor's consent.
 */
const readAppRouterRequest = memoize(async (): Promise<NextRequestFacts> => {
	const [nextHeaders, nextServer] = await Promise.all([
		import('next/headers.js'),
		import('next/server.js'),
	]);
	await nextServer.connection?.();
	const headers = (await nextHeaders.headers()) as Headers;
	const cookie =
		headers.get('cookie') ?? (await nextHeaders.cookies()).toString();
	return { cookie, headers };
});

const readRequestContext = async function readRequestContext(
	request: NextRequestContext
): Promise<NextRequestFacts> {
	const headers = await request.headers();
	const cookie = headers.get('cookie') ?? (await request.cookies()).toString();
	return { cookie, headers };
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
 * Type alias re-exported so consumers can stay within `@c15t/nextjs`.
 */
export type { KernelConfig } from '@c15t/core';
export type { ConsentState } from './types';
export type { ConsentConfig } from './config';
export { defineConsentConfig } from './config';

// -- Optional: server-side prefetch of the init roundtrip -------------------

export interface ResolveConsentOptions
	extends ConsentRequestOptions, ConsentSourceOptions {
	/**
	 * Override fetch. Useful for testing or for wiring Vercel's
	 * unstable_cache / Next.js `fetch`-level caching around the call.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Request headers to forward onto the backend call, such as an
	 * authentication token. Backend `/init` always gets the resolved geo,
	 * language and GPC, the user agent, and, over `https` or to a loopback
	 * host, the consent cookie alone, never the rest of the cookie jar. The
	 * manifest request carries only these headers. `cookie` and
	 * `x-forwarded-*` cannot be named here.
	 */
	forwardHeaders?: string[];

	/**
	 * Resolve a relative backend or manifest URL against the request's
	 * `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers
	 * instead of `host`, and forward the visitor IP to backend `/init`. Any
	 * client can send those headers, so set this only behind a proxy that
	 * sets them and drops incoming ones.
	 *
	 * @default false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Called when the backend or manifest request fails or runs out of
	 * `timeoutMs`. The helper still returns the request-only state so the page
	 * renders and the client retries on mount. When omitted, the failure is
	 * logged with `console.warn` outside production so it does not go
	 * unnoticed.
	 */
	onError?: (error: unknown) => void;

	/**
	 * Longest the render waits for the visitor's policy, in milliseconds.
	 * When it runs out the helper returns the request-only state: no consent
	 * UI in the server HTML, optional categories denied, and gated scripts
	 * and embeds blocked. The browser then resolves the policy after
	 * hydration and shows the banner. In manifest mode the request keeps
	 * running and fills the cache for the next render; pass `waitUntil` so
	 * the platform keeps it alive. `false` (or `Infinity`) waits for the
	 * upstream's own timeout; any other value that is not a finite,
	 * non-negative number uses the default.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;

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
	 * The consent journey scope this render reports. Defaults to the
	 * config's `journey`; `ConsentRoot` must use the same value.
	 */
	journey?: ConsentJourneyOption;
	/**
	 * The banner experiment with the arm this request runs, from your
	 * feature flag. While the visitor has no stored choice, the server's
	 * `/init` carries the arm, or its session report does in manifest mode,
	 * so the backend counts the visitors each arm's banner was owed to. The
	 * returned state carries the experiment to `ConsentRoot`, so the client
	 * needs no `experiment` option of its own.
	 *
	 * @example
	 * ```ts
	 * resolveConsent({ experiment: { ...bannerShape, arm } });
	 * ```
	 */
	experiment?: ServerExperiment;

	/**
	 * Receives work that outlives the render (the session report, a manifest
	 * refresh, or a manifest request `timeoutMs` stopped waiting for) so it
	 * survives the response on runtimes that stop detached work once a
	 * response is sent. In the App Router pass `after` from `next/server`:
	 * `(task) => after(() => task)`. The promise never rejects.
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
	error: unknown,
	url: string | undefined
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
		`[c15t] resolveConsent: request to ${url ?? 'the backend'} failed (${message}); rendering with the request-only state and letting the client retry.`
	);
};

/**
 * Resolve the visitor's consent state for the current request, from
 * `c15t.config.ts`.
 *
 * 1. Reads the consent cookie, geo headers, language, and GPC from the
 *    request.
 * 2. Resolves the visitor's policy for the config's `mode`: `manifest()`
 *    (the default) from the snapshot `withConsentManifest` downloaded, or
 *    `${backendURL}/manifest` through the in-process cache without one;
 *    `hosted()` from `${backendURL}/init`. `offline()` leaves it to the
 *    browser.
 * 3. Folds the result into a `ConsentState` so first paint is correct
 *    without waiting for a client roundtrip.
 *
 * Without a backend URL or snapshot, step 2 is skipped and the request-only
 * state is returned with no network call. If the request fails, does not
 * answer within `timeoutMs` (500 ms by default), or points under the
 * config's `routePrefix` (the app's own route, never fetched), the
 * request-only state is returned too: no consent UI is rendered on the
 * server, optional categories stay denied, and `ConsentRoot` resolves the
 * policy on mount. The failure reaches `onError` when provided, and is
 * otherwise logged outside production.
 *
 * Each call reads fresh headers and never caches across requests, so
 * concurrent requests stay isolated.
 *
 * @param options - Overrides of the config, fetch options, and how to read
 * the request
 * @returns The visitor's JSON-serializable state for `ConsentRoot`
 * @example
 * ```tsx
 * import { ConsentRoot } from 'c15t/next';
 * import { resolveConsent } from 'c15t/next/server';
 *
 * // In a Server Component. Not awaited: the page renders while consent
 * // resolves.
 * <ConsentRoot state={resolveConsent()}>{children}</ConsentRoot>;
 * ```
 */
export const resolveConsent = async function resolveConsent(
	options: ResolveConsentOptions = {}
): Promise<ConsentState> {
	const source = resolveConsentSource(options);
	const facts = options.request
		? await readRequestContext(options.request)
		: await readAppRouterRequest();
	const { routePrefix } = source;
	return (await resolveRequestConsent({
		adapter: '@c15t/nextjs',
		backendURL: source.backendURL,
		experiment: options.experiment,
		fetch: options.fetch,
		forwardHeaders: options.forwardHeaders,
		gvlRoute: routePrefix ? `${routePrefix}/init` : undefined,
		initHeaders: source.initHeaders,
		journey: options.journey ?? source.config?.journey,
		manifest: source.snapshot,
		// The manifest route's Data Cache hint, so a render and the route
		// share the Next.js Data Cache as well as the process cache.
		manifestFetchInit: { next: createManifestFetchInit().next } as Omit<
			RequestInit,
			'headers' | 'method'
		>,
		manifestURL: source.manifestURL,
		mode: source.mode,
		now: options.now,
		onError: (error, url) => reportPrefetchError(options, error, url),
		overrides: { country: options.country, language: options.language },
		// The app's own consent route: the render never fetches it.
		ownRoutes: routePrefix ? [routePrefix] : [],
		reportSessions: options.reportSessions,
		request: facts,
		storage: options.cookieName
			? { storageKey: options.cookieName }
			: undefined,
		timeoutMs: options.timeoutMs,
		trustForwardedHeaders: options.trustForwardedHeaders,
		waitUntil: options.waitUntil,
	})) as ConsentState;
};
