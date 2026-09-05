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
 * same-origin route.
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
}

/** Resolved proxy configuration shared by the handler factory. */
export interface ResolvedProxyOptions {
	paths: readonly string[];
	forwardHeaders: readonly string[];
}

/**
 * Normalizes `proxy: boolean | ConsentProxyOptions` into a resolved config,
 * or `undefined` when the proxy is off.
 */
export const resolveProxyOptions = function resolveProxyOptions(
	proxy: boolean | ConsentProxyOptions | undefined
): ResolvedProxyOptions | undefined {
	if (!proxy) {
		return undefined;
	}
	const options = proxy === true ? {} : proxy;
	return {
		forwardHeaders: [
			...DEFAULT_FORWARD_HEADERS,
			...(options.forwardHeaders ?? []).map((name) => name.toLowerCase()),
		],
		paths: [...DEFAULT_PROXY_PATHS, ...(options.paths ?? [])],
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

/**
 * `true` when `path` is allowed through the proxy. Each allowlist entry is
 * matched segment by segment; `*` matches exactly one non-empty segment.
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
	if (segments.some((segment) => segment === '' || segment === '..')) {
		return false;
	}
	return allowed.some((pattern) => matchesPattern(pattern, segments));
};

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
 * `cf-connecting-ip`, `x-real-ip`, ...). A `Request` carries no socket
 * address, so on a bare `vite dev` server with no proxy in front there is
 * nothing to forward and `x-forwarded-for` is omitted.
 */
export const buildProxyRequestHeaders = function buildProxyRequestHeaders(
	request: Request,
	forwardHeaders: readonly string[]
): Headers {
	const headers = new Headers();
	for (const name of forwardHeaders) {
		const value = request.headers.get(name);
		if (value !== null) {
			headers.set(name, value);
		}
	}

	appendForwardedFor(request.headers, headers);

	const url = new URL(request.url);
	headers.set(
		'x-forwarded-host',
		request.headers.get('x-forwarded-host') ?? url.host
	);
	headers.set(
		'x-forwarded-proto',
		request.headers.get('x-forwarded-proto') ?? url.protocol.replace(/:$/u, '')
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
	const target = `${backendURL.replace(/\/+$/u, '')}/${normalized}${search}`;
	const method = request.method.toUpperCase();
	const init: RequestInit & { duplex?: 'half' } = {
		headers: buildProxyRequestHeaders(request, options.forwardHeaders),
		method,
		redirect: 'manual',
	};
	if (!BODYLESS_METHODS.has(method) && request.body) {
		init.body = request.body;
		init.duplex = 'half';
	}

	const upstream = await (fetchImpl ?? globalThis.fetch)(target, init);
	return new Response(upstream.body, {
		headers: buildProxyResponseHeaders(upstream.headers),
		status: upstream.status,
		statusText: upstream.statusText,
	});
};
