/**
 * Opt-in same-origin proxy for the SvelteKit consent routes.
 *
 * Lets a SvelteKit app point `hosted({ url: '/api/c15t' })` at its own
 * origin: the browser talks to the app, the app forwards consent writes to
 * the c15t backend. Only the paths the client transport calls (`subjects`,
 * `subjects/:id`, `init`, `manifest`, `health`, `status`) plus explicitly
 * allowlisted extras are forwarded; everything else is a 404, so the route
 * is never an open proxy.
 *
 * The rules match `createConsentServerRoute({ proxy })` in
 * `@c15t/tanstack-start`. The hosted backend sits behind Vercel Firewall or
 * Cloudflare, and a bare server-to-server fetch (server TLS fingerprint, no
 * user agent, one egress IP for every visitor) scores as a bot, so the
 * browser's identity headers and the client address are forwarded, and
 * `x-c15t-proxy` plus the version headers give the platform a stable key for
 * a firewall bypass rule.
 */

import { c15tVersionHeaders } from '@c15t/core';
import { CONSENT_REQUEST_HEADER_NAMES } from '@c15t/schema/types';
import type { RequestEvent } from '@sveltejs/kit';

/** Value of the `x-c15t-proxy` header added to every forwarded request. */
const PROXY_HEADER_VALUE = '@c15t/svelte';

/** Paths the proxy forwards when no extra `paths` are configured. */
const DEFAULT_PROXY_PATHS: readonly string[] = [
	'subjects',
	'subjects/*',
	'init',
	'manifest',
	'health',
	'status',
];

/**
 * Browser headers forwarded upstream. Everything else the browser sent is
 * dropped: `host`, `content-length`, and the hop-by-hop set are wrong for
 * the upstream connection, and unknown headers must not leak through a
 * same-origin route. `cookie` is listed but only forwarded when
 * `cookieNames` names the cookies to send.
 */
const DEFAULT_FORWARD_HEADERS: readonly string[] = [
	'accept',
	'accept-language',
	'content-type',
	'cookie',
	'if-none-match',
	'origin',
	'referer',
	'user-agent',
	'sec-gpc',
	...CONSENT_REQUEST_HEADER_NAMES,
];

/** Headers that carry credentials and must never cross a cleartext link. */
const CREDENTIAL_HEADERS: ReadonlySet<string> = new Set([
	'authorization',
	'cookie',
	'proxy-authorization',
]);

/** Browser headers the default allowlist forwards that carry no identity. */
const PUBLIC_FORWARD_HEADERS: ReadonlySet<string> = new Set(
	DEFAULT_FORWARD_HEADERS.filter((name) => !CREDENTIAL_HEADERS.has(name))
);

/**
 * Headers that describe the hop chain. They are never copied from the
 * browser; the proxy sets them from SvelteKit's trusted request data.
 */
const FORWARDING_HEADERS: ReadonlySet<string> = new Set([
	'forwarded',
	'x-forwarded-for',
	'x-forwarded-host',
	'x-forwarded-proto',
]);

/** Headers the proxy itself sets on every upstream request. */
const PROXY_SET_HEADERS: ReadonlySet<string> = new Set([
	'x-c15t-proxy',
	...FORWARDING_HEADERS,
	...Object.keys(c15tVersionHeaders),
]);

/**
 * Upstream response headers that never reach the browser. Hop-by-hop
 * headers describe the upstream connection, not this one; `content-encoding`
 * and `content-length` describe a body the runtime `fetch` already decoded;
 * `set-cookie` is re-added below without its `Domain`.
 */
const STRIPPED_RESPONSE_HEADERS: ReadonlySet<string> = new Set([
	'connection',
	'content-encoding',
	'content-length',
	'keep-alive',
	'set-cookie',
	'transfer-encoding',
	'upgrade',
]);

/** `access-control-*` is meaningless once the response is same-origin. */
const STRIPPED_RESPONSE_PREFIXES = ['access-control-', 'proxy-'];

const BODYLESS_METHODS: ReadonlySet<string> = new Set([
	'GET',
	'HEAD',
	'OPTIONS',
]);

const LOOPBACK_HOSTS: ReadonlySet<string> = new Set([
	'localhost',
	'127.0.0.1',
	'[::1]',
	'::1',
]);

/** Deadline applied to upstream requests when none is configured. */
const DEFAULT_PROXY_TIMEOUT_MS = 10_000;

const MAX_DECODE_PASSES = 3;

/**
 * Options for the opt-in proxy,
 * `createSvelteKitConsentRouteHandlers({ proxy })`.
 */
export interface ConsentProxyOptions {
	/**
	 * Extra upstream paths to allow, relative to `backendURL`. Exact segments
	 * (`'export'`) or a trailing `*` for one wildcard segment
	 * (`'subjects/*'`). The defaults (`subjects`, `subjects/*`, `init`,
	 * `manifest`, `health`, `status`) are always allowed.
	 */
	paths?: readonly string[];
	/**
	 * Extra request headers to forward from the browser in addition to the
	 * default allowlist (`accept`, `accept-language`, `content-type`,
	 * `if-none-match`, `origin`, `referer`, `user-agent`, `sec-gpc`, and every
	 * consent request header). `x-forwarded-*` and `forwarded` are ignored:
	 * the proxy sets those itself.
	 */
	forwardHeaders?: readonly string[];
	/**
	 * Cookie names to forward upstream. No cookies are forwarded by default:
	 * the c15t backend does not read cookies, and the consent cookie is
	 * written and read in the browser. Set this only for a backend that
	 * expects one. Cookies are never sent to a remote `http:` backend.
	 */
	cookieNames?: readonly string[];
	/**
	 * Deadline for the upstream response, in milliseconds. Bounds how long a
	 * stalled backend can hold a server connection. The signal covers the
	 * whole exchange, body included.
	 *
	 * @default 10000
	 */
	timeoutMs?: number;
}

/** Resolved proxy configuration. @internal */
export interface ResolvedProxyOptions {
	paths: readonly string[];
	forwardHeaders: readonly string[];
	cookieNames?: readonly string[];
	timeoutMs: number;
}

/**
 * Normalizes `proxy: boolean | ConsentProxyOptions` into a resolved config,
 * or `undefined` when the proxy is off.
 *
 * @internal
 * @param proxy - The `proxy` route option.
 * @returns The resolved options, or `undefined` when the proxy is off.
 */
export const resolveProxyOptions = function resolveProxyOptions(
	proxy: boolean | ConsentProxyOptions | undefined
): ResolvedProxyOptions | undefined {
	if (!proxy) {
		return undefined;
	}
	const options = proxy === true ? {} : proxy;
	return {
		cookieNames: options.cookieNames,
		forwardHeaders: [
			...DEFAULT_FORWARD_HEADERS,
			...(options.forwardHeaders ?? []).map((name) => name.toLowerCase()),
		],
		paths: [...DEFAULT_PROXY_PATHS, ...(options.paths ?? [])],
		timeoutMs: options.timeoutMs ?? DEFAULT_PROXY_TIMEOUT_MS,
	};
};

/** Removes trailing slashes in linear time. */
const trimTrailingSlashes = function trimTrailingSlashes(
	value: string
): string {
	let end = value.length;
	while (end > 0 && value[end - 1] === '/') {
		end -= 1;
	}
	return value.slice(0, end);
};

/** Removes surrounding slashes, preserving interior path segments. */
const trimPathSlashes = function trimPathSlashes(value: string): string {
	const trimmed = trimTrailingSlashes(value);
	let start = 0;
	while (start < trimmed.length && trimmed[start] === '/') {
		start += 1;
	}
	return trimmed.slice(start);
};

const REST_PARAM = /\[\.\.\.(?<name>[^\]=]+)(?:=[^\]]+)?\]/u;

/**
 * The path below the route's rest parameter (`[...path]` in
 * `src/routes/api/c15t/[...path]/+server.ts`), or `undefined` when the route
 * has none.
 *
 * @internal
 * @param event - The request event.
 * @returns The rest path without surrounding slashes, or `undefined`.
 */
export const readRestPath = function readRestPath(
	event: RequestEvent
): string | undefined {
	const name = REST_PARAM.exec(event.route?.id ?? '')?.groups?.name;
	const value = name ? event.params?.[name] : undefined;
	return value === undefined ? undefined : trimPathSlashes(value);
};

/**
 * The upstream path for a proxied request: the rest parameter, or the last
 * path segment for a route file mounted at one fixed path
 * (`api/c15t/subjects/+server.ts`).
 */
const readProxyPath = function readProxyPath(event: RequestEvent): string {
	return (
		readRestPath(event) ??
		trimTrailingSlashes(event.url.pathname).split('/').pop() ??
		''
	);
};

const decodeSegment = function decodeSegment(segment: string): string | null {
	try {
		return decodeURIComponent(segment);
	} catch {
		return null;
	}
};

/**
 * `true` when a path segment could change the target once something
 * downstream decodes and normalizes it: empty, dot segments, or an encoded
 * separator. Decoding repeats until the value is stable (bounded), so a
 * doubly encoded `%252e%252e` is caught as well as `%2e%2e`.
 */
const isUnsafeSegment = function isUnsafeSegment(segment: string): boolean {
	let current = segment;
	for (let pass = 0; pass < MAX_DECODE_PASSES; pass += 1) {
		const decoded = decodeSegment(current);
		if (
			decoded === null ||
			decoded === '' ||
			decoded === '.' ||
			decoded === '..' ||
			decoded.includes('/') ||
			decoded.includes('\\')
		) {
			return true;
		}
		if (decoded === current) {
			return false;
		}
		current = decoded;
	}
	// Still changing after the bounded passes: refuse rather than guess.
	return true;
};

const matchesPattern = function matchesPattern(
	pattern: string,
	segments: readonly string[]
): boolean {
	const expected = trimPathSlashes(pattern).split('/');
	if (expected.length !== segments.length) {
		return false;
	}
	return expected.every(
		(segment, index) => segment === '*' || segment === segments[index]
	);
};

/**
 * `true` when `path` is allowed through the proxy. Each allowlist entry is
 * matched segment by segment; `*` matches exactly one non-empty segment.
 */
const isProxyPathAllowed = function isProxyPathAllowed(
	path: string,
	allowed: readonly string[]
): boolean {
	if (!path) {
		return false;
	}
	const segments = path.split('/');
	if (segments.some((segment) => isUnsafeSegment(segment))) {
		return false;
	}
	return allowed.some((pattern) => matchesPattern(pattern, segments));
};

/** `true` for an `http:` target that is not a loopback host. */
const isCleartextRemote = function isCleartextRemote(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'http:' && !LOOPBACK_HOSTS.has(parsed.hostname);
	} catch {
		return false;
	}
};

/** Keeps only the named cookies from a `Cookie` request header. */
const filterCookieHeader = function filterCookieHeader(
	cookieHeader: string,
	names: readonly string[]
): string | undefined {
	const allowed = new Set(names);
	const kept = cookieHeader
		.split(';')
		.map((pair) => pair.trim())
		.filter((pair) => {
			const name = pair.split('=')[0]?.trim();
			return name !== undefined && allowed.has(name);
		});
	return kept.length > 0 ? kept.join('; ') : undefined;
};

/**
 * Whether the upstream request carries anything a response could vary by
 * per visitor: a known credential, or any caller-configured header outside
 * the public default allowlist (an API key, a tenant selector, ...).
 */
const carriesIdentity = function carriesIdentity(headers: Headers): boolean {
	for (const name of headers.keys()) {
		if (
			CREDENTIAL_HEADERS.has(name) ||
			!(PUBLIC_FORWARD_HEADERS.has(name) || PROXY_SET_HEADERS.has(name))
		) {
			return true;
		}
	}
	return false;
};

const readClientAddress = function readClientAddress(
	event: RequestEvent
): string | undefined {
	try {
		return event.getClientAddress();
	} catch {
		// Some adapters and test harnesses cannot tell.
		return undefined;
	}
};

/**
 * Builds the upstream request headers: the browser allowlist, then the
 * forwarding trio, then the c15t identity headers.
 *
 * The client address comes from `event.getClientAddress()` and the host and
 * protocol from `event.url`. SvelteKit derives both from the adapter's
 * trusted configuration (`ADDRESS_HEADER`, `XFF_DEPTH`, `ORIGIN`), so a
 * visitor cannot pick the address or host the backend sees.
 */
const buildProxyRequestHeaders = function buildProxyRequestHeaders(
	event: RequestEvent,
	forwardHeaders: readonly string[],
	cookieNames: readonly string[] | undefined
): Headers {
	const { request } = event;
	const headers = new Headers();
	for (const name of forwardHeaders) {
		const value = request.headers.get(name);
		if (value === null || FORWARDING_HEADERS.has(name)) {
			continue;
		}
		if (name === 'cookie') {
			const scoped = cookieNames
				? filterCookieHeader(value, cookieNames)
				: undefined;
			if (scoped) {
				headers.set(name, scoped);
			}
			continue;
		}
		headers.set(name, value);
	}

	const clientAddress = readClientAddress(event);
	if (clientAddress) {
		headers.set('x-forwarded-for', clientAddress);
	}
	headers.set('x-forwarded-host', event.url.host);
	headers.set('x-forwarded-proto', event.url.protocol.replace(/:$/u, ''));
	for (const [name, value] of Object.entries(c15tVersionHeaders)) {
		headers.set(name, value);
	}
	headers.set('x-c15t-proxy', PROXY_HEADER_VALUE);
	return headers;
};

/** Drops the `Domain=` attribute so the cookie is host-only for the app. */
const rewriteSetCookie = function rewriteSetCookie(value: string): string {
	return value
		.split(';')
		.filter((part) => !/^\s*domain\s*=/iu.test(part))
		.join(';');
};

const readSetCookies = function readSetCookies(headers: Headers): string[] {
	const withGetSetCookie = headers as Headers & {
		getSetCookie?: () => string[];
	};
	if (typeof withGetSetCookie.getSetCookie === 'function') {
		return withGetSetCookie.getSetCookie();
	}
	const single = headers.get('set-cookie');
	return single ? [single] : [];
};

/**
 * Builds the browser-facing response headers: strips hop-by-hop,
 * body-encoding, and CORS headers, and re-appends each `set-cookie` without
 * its `Domain` attribute.
 */
const buildProxyResponseHeaders = function buildProxyResponseHeaders(
	upstream: Headers
): Headers {
	const headers = new Headers();
	upstream.forEach((value, name) => {
		const lower = name.toLowerCase();
		if (
			STRIPPED_RESPONSE_HEADERS.has(lower) ||
			STRIPPED_RESPONSE_PREFIXES.some((prefix) => lower.startsWith(prefix))
		) {
			return;
		}
		headers.set(lower, value);
	});
	for (const cookie of readSetCookies(upstream)) {
		headers.append('set-cookie', rewriteSetCookie(cookie));
	}
	return headers;
};

const notFound = () => Response.json({ error: 'Not found' }, { status: 404 });

/**
 * Forwards one request to `${backendURL}/${path}${search}` and returns the
 * upstream status and body as a stream, with headers shaped for the browser.
 *
 * @internal
 * @param input - The request event, the absolute backend URL, the resolved
 * options and the fetch to call.
 * @returns The upstream response, or a 404 when the path is not allowed.
 */
export const proxyConsentRequest = async function proxyConsentRequest(input: {
	event: RequestEvent;
	backendURL: string;
	options: ResolvedProxyOptions;
	fetch?: typeof globalThis.fetch;
}): Promise<Response> {
	const { backendURL, event, options } = input;
	const path = readProxyPath(event);
	if (!isProxyPathAllowed(path, options.paths)) {
		return notFound();
	}

	const base = trimTrailingSlashes(backendURL);
	const target = `${base}/${path}${event.url.search}`;
	// The segment check above rejects anything the URL parser would fold, so
	// the parsed target must still sit exactly at the allowlisted path.
	const expectedPathname = `${trimTrailingSlashes(new URL(base).pathname)}/${path}`;
	if (new URL(target).pathname !== expectedPathname) {
		return notFound();
	}

	// Nothing identity-bearing crosses a cleartext link to a remote host:
	// only the public browser allowlist survives. Loopback is allowed for
	// local development.
	const cleartextRemote = isCleartextRemote(target);
	const method = event.request.method.toUpperCase();
	const init: RequestInit & { duplex?: 'half'; headers: Headers } = {
		headers: buildProxyRequestHeaders(
			event,
			cleartextRemote
				? options.forwardHeaders.filter((name) =>
						PUBLIC_FORWARD_HEADERS.has(name)
					)
				: options.forwardHeaders,
			cleartextRemote ? undefined : options.cookieNames
		),
		method,
		redirect: 'manual',
	};
	if (options.timeoutMs > 0 && typeof AbortSignal.timeout === 'function') {
		init.signal = AbortSignal.timeout(options.timeoutMs);
	}
	if (!BODYLESS_METHODS.has(method) && event.request.body) {
		init.body = event.request.body;
		init.duplex = 'half';
	}

	const upstream = await (input.fetch ?? globalThis.fetch)(target, init);
	const responseHeaders = buildProxyResponseHeaders(upstream.headers);
	if (carriesIdentity(init.headers)) {
		// The response may vary by the forwarded identity; never let a shared
		// cache reuse it for the next visitor.
		responseHeaders.set('cache-control', 'private, no-store');
		responseHeaders.delete('etag');
		responseHeaders.delete('last-modified');
	}
	return new Response(upstream.body, {
		headers: responseHeaders,
		status: upstream.status,
		statusText: upstream.statusText,
	});
};
