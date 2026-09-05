/**
 * Opt-in same-origin proxy for the consent server route.
 *
 * Lets a Start app point `ConsentBoundary backendURL="/api/c15t"` at its own
 * origin, the way a Next.js app uses a `next.config` rewrite: the browser
 * talks to the app, the app forwards to the c15t backend. Only the paths the
 * client transport calls (`subjects`, `subjects/:id`, `init`, `manifest`,
 * `health`, `status`) plus any explicitly allowlisted extras are forwarded;
 * everything else is a 404, so the route is never an open proxy.
 *
 * Why the header shaping matters: the hosted backend sits behind Vercel
 * Firewall or Cloudflare. A bare server-to-server fetch carries a server TLS
 * fingerprint, no user agent, and one egress IP for every visitor, which
 * scores as a bot. Forwarding the browser's identity headers and the real
 * client IP gives the WAF the same signals a direct request would carry, and
 * `x-c15t-proxy` plus the version headers give the platform a stable key for
 * a firewall bypass rule. Vercel Attack Challenge Mode and Cloudflare Super
 * Bot Fight Mode still block the proxied write unless the consent paths are
 * exempted.
 */

import { c15tVersionHeaders } from '@c15t/core';
import { CONSENT_REQUEST_HEADER_NAMES, getIpAddress } from '@c15t/schema/geo';

import { filterCookieHeader } from './cookies';

/** Value of the `x-c15t-proxy` header added to every forwarded request. */
export const PROXY_HEADER_VALUE = '@c15t/tanstack-start';

/** Paths the proxy forwards when no extra `paths` are configured. */
export const DEFAULT_PROXY_PATHS: readonly string[] = [
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
export const DEFAULT_FORWARD_HEADERS: readonly string[] = [
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

/**
 * Upstream response headers that never reach the browser. Hop-by-hop
 * headers describe the upstream connection, not this one; `content-encoding`
 * and `content-length` describe a body the runtime `fetch` already decoded;
 * `access-control-*` is meaningless now that the response is same-origin.
 */
const STRIPPED_RESPONSE_HEADERS = new Set([
	'connection',
	'content-encoding',
	'content-length',
	'keep-alive',
	'set-cookie',
	'transfer-encoding',
	'upgrade',
]);

const STRIPPED_RESPONSE_PREFIXES = ['access-control-', 'proxy-'];

const BODYLESS_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Options for the opt-in proxy, `createConsentServerRoute({ proxy })`. */
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
	 * `cookie`, `if-none-match`, `origin`, `referer`, `user-agent`,
	 * `sec-gpc`, and every consent request header).
	 */
	forwardHeaders?: readonly string[];

	/**
	 * Cookie names to forward upstream. No cookies are forwarded by default:
	 * the c15t backend does not read cookies, and the consent cookie is
	 * written and read in the browser, so nothing from your origin's cookie
	 * jar needs to leave. Set this only for a backend that expects one.
	 */
	cookieNames?: readonly string[];

	/**
	 * Deadline for the upstream response, in milliseconds. Bounds how long a
	 * stalled backend can hold an app server connection. The signal covers
	 * the whole exchange, body included, so keep it above the time the
	 * largest consent payload needs.
	 *
	 * @default 10000
	 */
	timeoutMs?: number;
}

/** Deadline applied to upstream requests when none is configured. */
export const DEFAULT_PROXY_TIMEOUT_MS = 10_000;

/** Resolved proxy configuration shared by the handler factory. */
export interface ResolvedProxyOptions {
	paths: readonly string[];
	forwardHeaders: readonly string[];
	cookieNames?: readonly string[];
	timeoutMs: number;
	/**
	 * Forward the client IP chain. Only true behind a trusted proxy that
	 * sets `x-forwarded-for` itself; otherwise the first hop is whatever the
	 * client claimed and forwarding it would let a visitor pick the address
	 * the backend and its WAF see.
	 */
	trustForwardedHeaders: boolean;
}

/**
 * Normalizes `proxy: boolean | ConsentProxyOptions` into a resolved config,
 * or `undefined` when the proxy is off.
 */
export const resolveProxyOptions = function resolveProxyOptions(
	proxy: boolean | ConsentProxyOptions | undefined,
	trustForwardedHeaders = false
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
		trustForwardedHeaders,
	};
};

const normalizePath = function normalizePath(path: string): string {
	return path.replace(/^\/+|\/+$/gu, '');
};

const matchesPattern = function matchesPattern(
	pattern: string,
	segments: readonly string[]
): boolean {
	const expected = normalizePath(pattern).split('/');
	if (expected.length !== segments.length) {
		return false;
	}
	return expected.every(
		(segment, index) => segment === '*' || segment === segments[index]
	);
};

const decodeSegment = function decodeSegment(segment: string): string | null {
	try {
		return decodeURIComponent(segment);
	} catch {
		return null;
	}
};

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Headers that carry credentials and must never cross a cleartext link. */
const CREDENTIAL_HEADERS = new Set([
	'authorization',
	'cookie',
	'proxy-authorization',
]);

/** Headers the proxy itself sets on every upstream request. */
const PROXY_SET_HEADERS = new Set([
	'x-c15t-proxy',
	'x-forwarded-for',
	'x-forwarded-host',
	'x-forwarded-proto',
	...Object.keys(c15tVersionHeaders),
]);

/** Browser headers the default allowlist forwards that carry no identity. */
const PUBLIC_FORWARD_HEADERS = new Set(
	DEFAULT_FORWARD_HEADERS.filter((name) => !CREDENTIAL_HEADERS.has(name))
);

/**
 * Whether the upstream request carries anything a response could vary by
 * per visitor: a known credential, or any caller-configured header outside
 * the public default allowlist (an API key, a tenant selector, ...).
 */
const carriesIdentity = function carriesIdentity(headers: Headers): boolean {
	for (const name of headers.keys()) {
		const lower = name.toLowerCase();
		if (CREDENTIAL_HEADERS.has(lower)) {
			return true;
		}
		if (!(PUBLIC_FORWARD_HEADERS.has(lower) || PROXY_SET_HEADERS.has(lower))) {
			return true;
		}
	}
	return false;
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

const MAX_DECODE_PASSES = 3;

/**
 * `true` when a path segment could change the target once something
 * downstream decodes and normalizes it: empty, dot segments, or an encoded
 * separator. Decoding repeats until the value is stable (bounded), so a
 * doubly encoded `%252e%252e` is caught as well as `%2e%2e`. The proxy
 * itself decodes once; the extra passes are defence in depth against an
 * upstream that decodes again before normalizing.
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

/**
 * `true` when `path` is allowed through the proxy. Each allowlist entry is
 * matched segment by segment; `*` matches exactly one non-empty segment.
 * Segments are percent-decoded before the check, so `%2e%2e` and an encoded
 * slash are rejected the same as a literal `..`.
 */
export const isProxyPathAllowed = function isProxyPathAllowed(
	path: string,
	allowed: readonly string[]
): boolean {
	const normalized = normalizePath(path);
	if (!normalized) {
		return false;
	}
	const segments = normalized.split('/');
	if (segments.some((segment) => isUnsafeSegment(segment))) {
		return false;
	}
	return allowed.some((pattern) => matchesPattern(pattern, segments));
};

/**
 * Headers that describe the hop chain. They are never copied from the
 * browser through `forwardHeaders`; the trusted branch below builds them.
 */
export const FORWARDING_HEADERS: ReadonlySet<string> = new Set([
	'forwarded',
	'x-forwarded-for',
	'x-forwarded-host',
	'x-forwarded-proto',
]);

const appendForwardedFor = function appendForwardedFor(
	incoming: Headers,
	outgoing: Headers
) {
	// Unmasked on purpose: the WAF needs the real address to rate-limit and
	// score the visitor, and the backend masks before it stores anything.
	const clientIp = getIpAddress(incoming, { masking: false });
	const chain = (incoming.get('x-forwarded-for') ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
	if (clientIp && !chain.includes(clientIp)) {
		chain.push(clientIp);
	}
	if (chain.length > 0) {
		outgoing.set('x-forwarded-for', chain.join(', '));
	}
};

/**
 * Builds the upstream request headers: the browser allowlist, then the
 * forwarding trio (`x-forwarded-for`, `x-forwarded-host`,
 * `x-forwarded-proto`), then the c15t identity headers.
 *
 * The client IP comes from the platform's proxy headers (`x-forwarded-for`,
 * `cf-connecting-ip`, `x-real-ip`, ...), and is forwarded only when
 * `trustForwardedHeaders` is set: without a trusted proxy in front those
 * headers are client-controlled, and a `Request` carries no socket address
 * to check them against. Set the option on Vercel, Cloudflare, or behind
 * your own proxy so the backend and its firewall see the real visitor.
 */
export const buildProxyRequestHeaders = function buildProxyRequestHeaders(
	request: Request,
	forwardHeaders: readonly string[],
	cookieNames?: readonly string[],
	trustForwardedHeaders = false
): Headers {
	const headers = new Headers();
	for (const name of forwardHeaders) {
		const value = request.headers.get(name);
		if (value === null || FORWARDING_HEADERS.has(name.toLowerCase())) {
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

	if (trustForwardedHeaders) {
		appendForwardedFor(request.headers, headers);
	}

	// The incoming host and proto headers are only meaningful behind a proxy
	// that rewrites them; otherwise the request URL is the truth.
	const url = new URL(request.url);
	const incomingHost = trustForwardedHeaders
		? request.headers.get('x-forwarded-host')
		: null;
	const incomingProto = trustForwardedHeaders
		? request.headers.get('x-forwarded-proto')
		: null;
	headers.set('x-forwarded-host', incomingHost ?? url.host);
	headers.set(
		'x-forwarded-proto',
		incomingProto ?? url.protocol.replace(/:$/u, '')
	);

	for (const [name, value] of Object.entries(c15tVersionHeaders)) {
		headers.set(name, value);
	}
	headers.set('x-c15t-proxy', PROXY_HEADER_VALUE);
	return headers;
};

/**
 * Drops the `Domain=` attribute so a cookie the backend scoped to its own
 * host becomes host-only for the app origin.
 */
export const rewriteSetCookie = function rewriteSetCookie(
	value: string
): string {
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
 * Builds the browser-facing response headers from the upstream response:
 * strips hop-by-hop, body-encoding, and CORS headers, and re-appends each
 * `set-cookie` without its `Domain=` attribute.
 */
export const buildProxyResponseHeaders = function buildProxyResponseHeaders(
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

/** Inputs for {@link proxyConsentRequest}. */
export interface ProxyConsentRequestInput {
	/** The incoming browser request. */
	request: Request;
	/** Splat path below the route prefix, for example `subjects/sub_1`. */
	path: string;
	/** Absolute backend base URL, without a trailing slash. */
	backendURL: string;
	/** Resolved proxy options. */
	options: ResolvedProxyOptions;
	/** Fetch implementation. Defaults to `globalThis.fetch`. */
	fetch?: typeof globalThis.fetch;
}

/**
 * Forwards one request to `${backendURL}/${path}${search}` and returns the
 * upstream status and body as a stream, with headers shaped for the browser.
 *
 * @returns A 404 JSON response when `path` is not allowlisted.
 */
export const proxyConsentRequest = async function proxyConsentRequest({
	backendURL,
	fetch: fetchImpl,
	options,
	path,
	request,
}: ProxyConsentRequestInput): Promise<Response> {
	const normalized = normalizePath(path);
	if (!isProxyPathAllowed(normalized, options.paths)) {
		return Response.json({ error: 'Not found' }, { status: 404 });
	}

	const { search } = new URL(request.url);
	const base = backendURL.replace(/\/+$/u, '');
	const target = `${base}/${normalized}${search}`;
	// Credentials never travel in clear text to a remote backend; a loopback
	// host is allowed for local development.
	const cleartextRemote = isCleartextRemote(target);
	const cookieNames = cleartextRemote ? undefined : options.cookieNames;
	// Belt and braces: the segment check above rejects anything the URL
	// parser would fold, so the parsed target must still sit exactly at the
	// allowlisted path under the backend base.
	const expectedPathname = `${new URL(base).pathname.replace(/\/+$/u, '')}/${normalized}`;
	if (new URL(target).pathname !== expectedPathname) {
		return Response.json({ error: 'Not found' }, { status: 404 });
	}
	const method = request.method.toUpperCase();
	const init: RequestInit & { duplex?: 'half'; headers: Headers } = {
		headers: buildProxyRequestHeaders(
			request,
			cleartextRemote
				? options.forwardHeaders.filter((name) => !CREDENTIAL_HEADERS.has(name))
				: options.forwardHeaders,
			cookieNames,
			options.trustForwardedHeaders
		),
		method,
		redirect: 'manual',
	};
	if (options.timeoutMs > 0 && typeof AbortSignal.timeout === 'function') {
		init.signal = AbortSignal.timeout(options.timeoutMs);
	}
	if (!BODYLESS_METHODS.has(method) && request.body) {
		init.body = request.body;
		init.duplex = 'half';
	}

	const upstream = await (fetchImpl ?? globalThis.fetch)(target, init);
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
