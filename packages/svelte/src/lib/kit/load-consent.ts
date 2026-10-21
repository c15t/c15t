/**
 * `loadConsent` — the `+layout.server.ts` half of the SvelteKit layer.
 *
 * Returns `{ consent }`: a plain, serializable state for `<ConsentRoot
 * state>`. With it the kernel resolves the policy on the server, so the
 * banner is in the first HTML instead of appearing a frame after
 * hydration. The resolution itself is `resolveRequestConsent` from
 * `@c15t/core/server`; this module supplies what SvelteKit knows about the
 * request: `event.request`, `event.url`, `event.fetch`, the platform's
 * `waitUntil`, and the config and inputs `c15tHandle` stored.
 */
import { building } from '$app/env';
import {
	backendURL as builtBackendURL,
	snapshot as builtSnapshot,
} from '@c15t/core/generated';
import type { ConsentMode } from '@c15t/core/modes';
import {
	readWaitUntil,
	resolveRequestConsent,
	resolveRequestSubject,
} from '@c15t/core/server';
import type { ResolveRequestConsentOptions } from '@c15t/core/server';
import type { RequestEvent } from '@sveltejs/kit';

import type { ConsentRootState } from '../types';
import type { C15tLocals, ConsentRequestOptions } from './types';

/** Options for {@link loadConsent}, when you call it from your own `load`. */
export interface LoadConsentOptions extends ConsentRequestOptions {
	/** Report manifest resolutions to the backend. @default true */
	reportSessions?: boolean;
	/**
	 * Keeps session reports and unfinished init requests alive after the response.
	 * Used when `event.platform.context.waitUntil` is unavailable. Pass the
	 * platform's `waitUntil`, such as the one from `@vercel/functions`.
	 */
	onBackgroundRevalidate?: (task: Promise<void>, event: RequestEvent) => void;

	/**
	 * Extra request headers to forward upstream in hosted mode, such as a
	 * token a private backend needs. Like the consent cookie (the only
	 * cookie forwarded), they travel only over `https`, to a loopback host,
	 * or in-process. `cookie` and `forwarded`/`x-forwarded-*` cannot be
	 * named here.
	 */
	forwardHeaders?: string[];

	/**
	 * Hosted mode: resolve a relative `backendURL` against the request's
	 * `forwarded`, `x-forwarded-host` and `x-forwarded-proto` headers instead
	 * of `event.url`. Any client can send those headers, and `loadConsent`
	 * forwards the consent cookie to the resolved backend, so set this
	 * only behind a proxy that sets them and drops incoming ones. Prefer
	 * setting the origin where SvelteKit builds `event.url`: `paths.origin`
	 * in SvelteKit 3 (adapter-node's `ORIGIN` in SvelteKit 2, which
	 * SvelteKit 3 ignores), or the adapter's `HOST_HEADER` and
	 * `PROTOCOL_HEADER`. Also forwards the visitor IP to the backend as
	 * `x-forwarded-for`, which is skipped otherwise.
	 *
	 * @defaultValue false
	 */
	trustForwardedHeaders?: boolean;

	/**
	 * Fetch for a backend on another origin. Defaults to the global `fetch`;
	 * a URL on this app's origin always goes through `event.fetch`,
	 * in-process. A custom fetch keeps the vendor list inline, since the
	 * browser cannot replay it.
	 */
	fetch?: typeof globalThis.fetch;

	/**
	 * Longest `loadConsent` waits for the manifest or the backend `/init`,
	 * in milliseconds. When it runs out, `loadConsent` returns the
	 * cookie-only state, the same as when the call fails: the page renders
	 * without consent UI in the server HTML, optional categories stay
	 * denied, and the browser resolves the policy after hydration.
	 *
	 * `false` (or `Infinity`) waits for the upstream, however long it takes.
	 * Any other value that is not a finite, non-negative number uses the
	 * default.
	 *
	 * @default 500
	 */
	timeoutMs?: number | false;
}

const readLocals = function readLocals(
	event: RequestEvent
): C15tLocals | undefined {
	return (event.locals as { c15t?: C15tLocals }).c15t;
};

/** Prefer the adapter's hook; use the caller's hook on other platforms. */
const backgroundWorkFor = (
	event: RequestEvent,
	fallback: LoadConsentOptions['onBackgroundRevalidate']
) => {
	const platformHook = readWaitUntil(
		(event.platform as { context?: unknown } | undefined)?.context
	);
	return (
		platformHook ??
		(fallback ? (task: Promise<void>) => fallback(task, event) : undefined)
	);
};

/** How the server resolves each mode. */
const serverResolution = function serverResolution(
	mode: ConsentMode,
	locals: C15tLocals | undefined,
	backendURL: string | undefined
): Pick<
	ResolveRequestConsentOptions,
	| 'backendURL'
	| 'gvlRoute'
	| 'initHeaders'
	| 'manifest'
	| 'manifestURL'
	| 'mode'
	| 'offline'
> {
	if (mode.type === 'offline') {
		return { mode: 'offline', offline: { policyRules: mode.policyRules } };
	}
	if (mode.type === 'hosted') {
		return { backendURL, initHeaders: mode.headers, mode: 'hosted' };
	}
	if (mode.resolve === 'browser') {
		// The browser resolves; the server reads the cookie only.
		return {};
	}
	return {
		backendURL,
		// The catch-all serves deferred vendor lists only on its init path.
		gvlRoute:
			locals?.routePrefix === undefined
				? undefined
				: `${locals.routePrefix}/init`,
		manifest:
			mode.snapshot ??
			(mode.source === 'runtime'
				? undefined
				: (locals?.snapshot ?? builtSnapshot)),
		manifestURL: mode.manifestURL,
		mode: 'manifest',
	};
};

/**
 * The mode as the browser receives it. A manifest resolved on the server
 * needs no snapshot there.
 */
const browserMode = function browserMode(mode: ConsentMode): ConsentMode {
	if (mode.type !== 'manifest' || mode.resolve === 'browser') {
		return mode;
	}
	const { snapshot: _snapshot, source: _source, ...data } = mode;
	return data;
};

/** The consent cookie core reads when no `cookieName` is given. */
const DEFAULT_COOKIE_NAME = 'c15t';

/** Whether two `cookieName` options name the same cookie once defaulted. */
const sameCookieName = function sameCookieName(
	left: string | undefined,
	right: string | undefined
): boolean {
	return (left ?? DEFAULT_COOKIE_NAME) === (right ?? DEFAULT_COOKIE_NAME);
};

/**
 * The request cookie header the resolution reads. The handle set the subject
 * cookie under its own name; a call that reads another name sets that one's
 * cookie here, with the handle's attributes.
 */
const requestCookie = function requestCookie(
	event: RequestEvent,
	locals: C15tLocals | undefined,
	cookieName: string | undefined,
	shared: boolean,
	options: LoadConsentOptions
): string | undefined {
	if (!locals || sameCookieName(cookieName, locals.cookieName)) {
		return locals?.cookie;
	}
	const subject = resolveRequestSubject({
		request: { headers: event.request.headers, url: event.url },
		shared,
		storage: { ...locals.storage, storageKey: cookieName },
		trustForwardedHeaders: options.trustForwardedHeaders,
	});
	if (!subject?.setCookie) {
		return undefined;
	}
	const { header: _header, name, value, ...attributes } = subject.setCookie;
	event.cookies.set(name, value, attributes);
	return subject.cookie;
};

/**
 * The request as `c15tHandle` left it: its inputs, unless this call
 * overrides them, and the cookie header with the subject ID it set.
 */
const requestFrom = function requestFrom(
	event: RequestEvent,
	locals: C15tLocals | undefined,
	overridesPerCall: boolean,
	cookie: string | undefined
) {
	return {
		cookie,
		headers: event.request.headers,
		inputs: locals && !overridesPerCall ? locals.inputs : undefined,
		url: event.url,
	};
};

/**
 * Resolves the visitor's consent for `<ConsentRoot state>`. Export it as
 * the root layout's `load`:
 *
 * ```ts
 * // src/routes/+layout.server.ts
 * export { loadConsent as load } from '@c15t/svelte/kit';
 * ```
 *
 * ```svelte
 * <!-- src/routes/+layout.svelte -->
 * <ConsentRoot state={data.consent}>
 * ```
 *
 * It resolves with the mode `c15tHandle()` was given, `manifest()` by
 * default, from the snapshot `consentManifest()` downloaded. Without a
 * snapshot it fetches the manifest from the backend, and caches it.
 *
 * Never throws: a failed upstream call degrades to the cookie-only state
 * rather than taking the page down with it. Neither does a slow one: after
 * `timeoutMs` (500 ms by default) the cookie-only state is returned. While
 * SvelteKit prerenders, the page carries no visitor's consent and makes no
 * upstream call; the browser resolves the visitor itself.
 *
 * @param event - The SvelteKit request event from `load`.
 * @param options - Geo/language overrides, upstream fetch settings and the
 * time budget, when you call it from your own `load`.
 * @returns `{ consent }`, for `<ConsentRoot state={data.consent}>`.
 */
export const loadConsent = async function loadConsent(
	event: RequestEvent,
	options: LoadConsentOptions = {}
): Promise<{ consent: ConsentRootState }> {
	const locals = readLocals(event);
	const mode: ConsentMode = locals?.mode ?? { type: 'manifest' };
	const backendURL =
		(mode.type === 'hosted' ? mode.backendURL : undefined) ??
		locals?.backendURL ??
		builtBackendURL;
	// Per-call inputs beat the handle's: a route that passes `country` is
	// naming the country for that page. The handle's cookie name is part of
	// the request context, so a per-call `country` keeps it.
	const overridesPerCall =
		options.country !== undefined ||
		options.language !== undefined ||
		options.region !== undefined;
	const cookieName = options.cookieName ?? locals?.cookieName;
	const shared = building || locals?.shared === true;
	const state = await resolveRequestConsent({
		adapter: '@c15t/svelte',
		...serverResolution(mode, locals, backendURL),
		fetch: options.fetch,
		forwardHeaders: options.forwardHeaders,
		// SvelteKit answers this app's own routes in-process, so the consent
		// route never leaves the server and the request's host never picks
		// where a relative backend goes.
		localFetch: event.fetch,
		overrides: {
			country: options.country,
			language: options.language,
			region: options.region,
		},
		reportSessions: options.reportSessions,
		request: requestFrom(
			event,
			locals,
			overridesPerCall,
			requestCookie(event, locals, cookieName, shared, options)
		),
		// A prerendered page is one HTML file for every visitor.
		shared,
		storage: cookieName ? { storageKey: cookieName } : undefined,
		timeoutMs: options.timeoutMs,
		trustForwardedHeaders: options.trustForwardedHeaders,
		waitUntil: backgroundWorkFor(event, options.onBackgroundRevalidate),
	});
	const consent: ConsentRootState = {
		mode: browserMode(mode),
		prefetch: state,
	};
	if (backendURL !== undefined) {
		consent.backendURL = backendURL;
	}
	if (locals?.routePrefix !== undefined) {
		consent.routePrefix = locals.routePrefix;
	}
	return { consent };
};
